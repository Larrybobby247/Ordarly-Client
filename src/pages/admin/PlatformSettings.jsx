import { useEffect, useState } from 'react';
import { api, naira } from '../../lib/api';
import { Alert, Field, Spinner } from '../../components/ui';
import { PageHead } from '../../components/adminKit';

// Runs the server's self-check so you can see (without reading logs) whether Paystack, the webhook URL and the main settings are right.
function SystemCheck() {
  const [d, setD] = useState(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const run = async () => { setBusy(true); setErr(''); try { setD(await api.get('/admin/system-check')); } catch (e) { setErr(e.message); } finally { setBusy(false); } };
  const Row = ({ ok, label, hint }) => (
    <li className="flex gap-2 py-2 text-sm"><span className={ok ? 'text-brand-600' : 'text-red-600'} aria-hidden="true">{ok ? '✓' : '✗'}</span><span><b>{label}</b>{!ok && hint && <span className="block text-xs text-ink-500">{hint}</span>}</span></li>
  );
  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-bold">System check</h2><p className="text-xs text-ink-500">Checks that Paystack and your main settings are connected on this server.</p></div>
        <button className="btn-primary" disabled={busy} onClick={run}>{busy ? 'Checking…' : d ? 'Run again' : 'Run check'}</button></div>
      {err && <div className="mt-3"><Alert>{err}</Alert></div>}
      {d && (
        <div className="mt-3">
          <ul className="divide-y divide-black/5">
            <Row ok={d.database} label="Database connected" hint="Check MONGODB_URI on Render." />
            <Row ok={d.nodeEnv === 'production'} label={`NODE_ENV is ${d.nodeEnv}`} hint="Set NODE_ENV=production on Render. Without it, login cookies won't work between your website and the API." />
            <Row ok={!!d.clientUrl && /^https:\/\//.test(d.clientUrl)} label={`CLIENT_URL: ${d.clientUrl || 'not set'}`} hint="Set CLIENT_URL to your website address (https://…, no slash at the end). Paystack sends customers back here after paying." />
            <Row ok={d.paystack.mode !== 'missing'} label={`Paystack key: ${d.paystack.mode}`} hint="Add PAYSTACK_SECRET_KEY in the Render Environment tab, then redeploy." />
            <Row ok={d.paystack.reachable} label="Paystack accepts this key" hint={d.paystack.message || 'Not tested because no key is set.'} />
            <Row ok={d.subaccounts.notFound === 0} label={d.subaccounts.checked ? `Restaurant payout accounts found by Paystack (${d.subaccounts.checked - d.subaccounts.notFound} of ${d.subaccounts.checked} checked)` : 'No connected restaurant payout accounts to check yet'}
              hint="Some payout accounts were created with a different key (usually test mode). Restaurants must disconnect and reconnect Online payments after you switch to live keys." />
            <Row ok={d.configured.jwtSecret} label="JWT_SECRET set" hint="Required for login." />
            <Row ok={d.configured.email} label="Email (Resend) key set" hint="Add RESEND_API_KEY so order and verification emails send." />
            <Row ok={d.configured.addressSearch} label="Address search key set (LocationIQ)" hint="Add LOCATIONIQ_API_KEY, otherwise delivery stays hidden." />
            <Row ok={d.configured.pushNotifications} label="Device notification keys set" hint="Optional. Add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY." />
          </ul>
          <div className="mt-3 rounded-2xl bg-mint-50 p-3 text-xs"><b>Webhook URL to paste into Paystack (Settings → API Keys &amp; Webhooks, in the LIVE section):</b><div className="mt-1 break-all font-mono">{d.webhookUrl}</div></div>
        </div>)}
    </div>
  );
}

export default function PlatformSettings() {
  const [p, setP] = useState(null); const [plans, setPlans] = useState(null); const [err, setErr] = useState('');
  const [m1, setM1] = useState(null); const [m2, setM2] = useState(null); const [busy, setBusy] = useState('');
  useEffect(() => { api.get('/admin/settings').then((r) => { setP(r.platform); setPlans(r.plans); }).catch((e) => setErr(e.message)); }, []);
  if (err) return <Alert>{err}</Alert>;
  if (!p || !plans) return <Spinner />;

  const saveGeneral = async (e) => {
    e.preventDefault(); setBusy('g'); setM1(null);
    try {
      const r = await api.put('/admin/settings', { supportEmail: p.supportEmail || '', registrationOpen: !!p.registrationOpen, announcement: { enabled: !!p.announcement.enabled, text: p.announcement.text || '', tone: p.announcement.tone || 'info' } });
      setP(r); setM1({ kind: 'ok', text: 'Saved.' });
    } catch (x) { setM1({ kind: 'error', text: x.message }); } finally { setBusy(''); }
  };
  const savePlans = async (e) => {
    e.preventDefault(); setBusy('p'); setM2(null);
    const n = (v) => Number(v);
    try {
      const r = await api.put('/admin/plans', {
        free: { maxActiveMeals: plans.free.maxActiveMeals === null || plans.free.maxActiveMeals === '' ? null : n(plans.free.maxActiveMeals), commissionPct: n(plans.free.commissionPct) },
        pro: { priceNgn: n(plans.pro.priceNgn), commissionPct: n(plans.pro.commissionPct), yearlyDiscountPct: n(plans.pro.yearlyDiscountPct) },
        business: { enabled: !!plans.business.enabled, priceNgn: n(plans.business.priceNgn), maxBranches: n(plans.business.maxBranches), commissionPct: n(plans.business.commissionPct), yearlyDiscountPct: n(plans.business.yearlyDiscountPct) },
      });
      setPlans(r); setM2({ kind: 'ok', text: 'Saved. New prices and commission rates apply to future payments and orders only.' });
    } catch (x) { setM2({ kind: 'error', text: x.message }); } finally { setBusy(''); }
  };
  const setA = (patch) => setP({ ...p, announcement: { ...p.announcement, ...patch } });
  const setPlan = (k, patch) => setPlans({ ...plans, [k]: { ...plans[k], ...patch } });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHead title="Platform settings" sub="Changes here affect every restaurant. Each save is recorded in the audit log." />
      <SystemCheck />

      <form onSubmit={saveGeneral} className="card space-y-5 p-6">
        <h2 className="font-bold">General</h2>
        {m1 && <Alert kind={m1.kind}>{m1.text}</Alert>}
        <Field label="Support email" hint="Shown on the Contact page."><input type="email" className="input" placeholder="support@yourdomain.com" value={p.supportEmail || ''} onChange={(e) => setP({ ...p, supportEmail: e.target.value })} /></Field>
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={!!p.registrationOpen} onChange={(e) => setP({ ...p, registrationOpen: e.target.checked })} /><span><b>Allow new restaurant sign-ups</b><span className="block text-xs text-ink-500">Turn off to pause registrations. Existing accounts are not affected.</span></span></label>

        <div className="rounded-2xl border border-black/5 p-4">
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={!!p.announcement.enabled} onChange={(e) => setA({ enabled: e.target.checked })} /><span><b>Show an announcement banner</b><span className="block text-xs text-ink-500">Appears at the top of every restaurant dashboard.</span></span></label>
          <div className="mt-3"><Field label="Banner text"><input className="input" maxLength={300} value={p.announcement.text || ''} onChange={(e) => setA({ text: e.target.value })} placeholder="e.g. Paystack maintenance tonight 11pm–12am" /></Field></div>
          {p.announcement.enabled && p.announcement.text && <div className="mt-3 rounded-2xl bg-sky-50 px-4 py-2 text-center text-sm font-medium text-sky-800">{p.announcement.text}</div>}
        </div>
        <button className="btn-primary" disabled={busy === 'g'}>{busy === 'g' ? 'Saving…' : 'Save general settings'}</button>
      </form>

      <form onSubmit={savePlans} className="card space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">Plans, pricing & commission</h2><a href="/admin/revenue" className="text-xs font-semibold text-brand-600 underline">Revenue & commission overview</a></div>
        {m2 && <Alert kind={m2.kind}>{m2.text}</Alert>}

        <fieldset className="space-y-3 rounded-2xl border border-black/5 p-4"><legend className="px-1 text-sm font-bold">Free plan</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Commission on meal subtotal (%)" hint="Charged on completed online-paid orders. Never on delivery fees."><input type="number" className="input" min={0} max={50} step="0.1" required value={plans.free.commissionPct} onChange={(e) => setPlan('free', { commissionPct: e.target.value })} /></Field>
            <Field label="Active meals limit" hint="Leave empty for unlimited."><input type="number" className="input" min={1} max={1000} placeholder="Unlimited" value={plans.free.maxActiveMeals ?? ''} onChange={(e) => setPlan('free', { maxActiveMeals: e.target.value === '' ? null : e.target.value })} /></Field>
          </div></fieldset>

        <fieldset className="space-y-3 rounded-2xl border border-black/5 p-4"><legend className="px-1 text-sm font-bold">Pro plan</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Price per month (₦)" hint={`Currently ${naira(plans.pro.priceNgn)}`}><input type="number" className="input" min={100} step={100} required value={plans.pro.priceNgn} onChange={(e) => setPlan('pro', { priceNgn: e.target.value })} /></Field>
            <Field label="Commission (%)"><input type="number" className="input" min={0} max={50} step="0.1" required value={plans.pro.commissionPct} onChange={(e) => setPlan('pro', { commissionPct: e.target.value })} /></Field>
            <Field label="Yearly discount (%)"><input type="number" className="input" min={0} max={50} step="0.5" required value={plans.pro.yearlyDiscountPct} onChange={(e) => setPlan('pro', { yearlyDiscountPct: e.target.value })} /></Field>
          </div></fieldset>

        <fieldset className="space-y-3 rounded-2xl border border-black/5 p-4"><legend className="px-1 text-sm font-bold">Business / Multi-branch plan</legend>
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={!!plans.business.enabled} onChange={(e) => setPlan('business', { enabled: e.target.checked })} /><span><b>Open for sign-up</b><span className="block text-xs text-ink-500">Needs a price and a branch limit above zero. While off, the site shows "Custom" and restaurants cannot buy it (admins can still grant it).</span></span></label>
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Price per month (₦)"><input type="number" className="input" min={0} step={100} required value={plans.business.priceNgn} onChange={(e) => setPlan('business', { priceNgn: e.target.value })} /></Field>
            <Field label="Branch limit"><input type="number" className="input" min={0} max={500} required value={plans.business.maxBranches} onChange={(e) => setPlan('business', { maxBranches: e.target.value })} /></Field>
            <Field label="Commission (%)"><input type="number" className="input" min={0} max={50} step="0.1" required value={plans.business.commissionPct} onChange={(e) => setPlan('business', { commissionPct: e.target.value })} /></Field>
            <Field label="Yearly discount (%)"><input type="number" className="input" min={0} max={50} step="0.5" required value={plans.business.yearlyDiscountPct} onChange={(e) => setPlan('business', { yearlyDiscountPct: e.target.value })} /></Field>
          </div></fieldset>

        <Alert kind="info">Prices and commission are always applied on the server. A commission rate is fixed on each order when it is placed, so changing it never alters orders that already exist. Lowering a limit never deletes anything.</Alert>
        <button className="btn-primary" disabled={busy === 'p'}>{busy === 'p' ? 'Saving…' : 'Save plans'}</button>
      </form>
    </div>
  );
}
