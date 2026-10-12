import { useEffect, useState } from 'react';
import { api, naira } from '../../lib/api';
import { Alert, Field, Spinner } from '../../components/ui';
import { PageHead } from '../../components/adminKit';

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
    try {
      const r = await api.put('/admin/plans', { free: { maxActiveMeals: Number(plans.free.maxActiveMeals) }, pro: { priceNgn: Number(plans.pro.priceNgn), trialDays: Number(plans.pro.trialDays) } });
      setPlans(r); setM2({ kind: 'ok', text: 'Saved. New prices apply to future payments only.' });
    } catch (x) { setM2({ kind: 'error', text: x.message }); } finally { setBusy(''); }
  };
  const setA = (patch) => setP({ ...p, announcement: { ...p.announcement, ...patch } });
  const setPlan = (k, patch) => setPlans({ ...plans, [k]: { ...plans[k], ...patch } });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHead title="Platform settings" sub="Changes here affect every restaurant. Each save is recorded in the audit log." />

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

      <form onSubmit={savePlans} className="card space-y-5 p-6">
        <h2 className="font-bold">Plans & pricing</h2>
        {m2 && <Alert kind={m2.kind}>{m2.text}</Alert>}
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Pro price per month (₦)" hint={`Currently ${naira(plans.pro.priceNgn)}`}><input type="number" className="input" min={100} step={100} required value={plans.pro.priceNgn} onChange={(e) => setPlan('pro', { priceNgn: e.target.value })} /></Field>
          <Field label="Free trial (days)"><input type="number" className="input" min={0} max={90} required value={plans.pro.trialDays} onChange={(e) => setPlan('pro', { trialDays: e.target.value })} /></Field>
          <Field label="Free plan: active meals"><input type="number" className="input" min={1} max={1000} required value={plans.free.maxActiveMeals} onChange={(e) => setPlan('free', { maxActiveMeals: e.target.value })} /></Field>
        </div>
        <Alert kind="info">The price is always applied on the server when a payment starts. Lowering the meal limit does not delete anything: restaurants over the limit just can't activate more meals.</Alert>
        <button className="btn-primary" disabled={busy === 'p'}>{busy === 'p' ? 'Saving…' : 'Save plans'}</button>
      </form>
    </div>
  );
}
