import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
// PERF (changed): the QR library is no longer bundled with every dashboard page. It is downloaded only when the QR page is opened.
const loadQR = () => import('qrcode').then((m) => m.default || m);
import { api, naira } from '../../lib/api';
import { useDash } from '../../components/DashboardLayout';
import { Alert, Badge, ProLock, Spinner, Field } from '../../components/ui';
import { Stat } from './Overview';


/* ---------------- Paystack connect ---------------- */
function PaystackConnect({ p, reload, setMsg, enabled }) {
  const [banks, setBanks] = useState(null); const [f, setF] = useState({ bankCode: '', accountNumber: '', password: '' });
  const [name, setName] = useState(''); const [busy, setBusy] = useState(false); const [open, setOpen] = useState(false);
  const run = async (fn) => { setBusy(true); setMsg(null); try { await fn(); } catch (e) { setMsg({ kind: 'error', text: e.message }); } finally { setBusy(false); } };
  const openForm = () => run(async () => { setBanks(await api.get('/restaurant/payments/paystack/banks')); setOpen(true); });
  const bankName = banks?.find((b) => b.code === f.bankCode)?.name || '';
  const status = p.paystack.status;
  return (
    <div className="mt-4 space-y-3">
      {p.paystack.settlementAccount && <div className="rounded-2xl bg-mint-50 p-3 text-sm">Settlement account: {bankName || ''} {p.paystack.settlementAccount}</div>}
      <div className="text-xs text-ink-500">Money flow: customer pays → Paystack collects and allocates your share to your subaccount (the platform's share is 0%) → Paystack settles to your bank on its own schedule. Collection, allocation and settlement are separate steps; Ordarly cannot make settlement instant.</div>
      {status === 'pending' && <Alert kind="info">Paystack has not confirmed this subaccount yet. Online payment stays hidden from customers until it does.</Alert>}
      {status === 'attention' && <Alert>Paystack reports a problem with this subaccount. Reconnect your account or contact support.</Alert>}
      <div className="flex flex-wrap gap-2">
        <button className="btn-dark" disabled={busy} onClick={openForm}>{status === 'not_configured' ? 'Connect settlement account' : 'Change settlement account'}</button>
        {p.paystack.subaccountCode && <button className="btn-ghost" disabled={busy} onClick={() => run(async () => { await api.post('/restaurant/payments/paystack/refresh'); await reload(); })}>Refresh status</button>}
        {status === 'active' && <label className="btn-ghost cursor-pointer gap-2"><input type="checkbox" checked={enabled} onChange={(e) => run(async () => { await api.put('/restaurant/payments/toggles', { paystackEnabled: e.target.checked }); await reload(); })} />Offer Paystack at checkout</label>}
      </div>
      {open && banks && (
        <form className="space-y-3 rounded-2xl border border-black/10 p-4" onSubmit={(e) => { e.preventDefault(); run(async () => { const r = await api.post('/restaurant/payments/paystack/connect', { ...f, bankName }); setMsg({ kind: r.status === 'active' ? 'ok' : 'info', text: `Account name: ${r.accountName}. Status: ${r.status}.` }); setOpen(false); setF({ bankCode: '', accountNumber: '', password: '' }); await reload(); }); }}>
          <Field label="Bank"><select className="input" required value={f.bankCode} onChange={(e) => { setF({ ...f, bankCode: e.target.value }); setName(''); }}><option value="">Select bank</option>{banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}</select></Field>
          <Field label="Account number"><input className="input" required inputMode="numeric" maxLength={10} value={f.accountNumber} onChange={(e) => { setF({ ...f, accountNumber: e.target.value }); setName(''); }} /></Field>
          {f.bankCode && f.accountNumber.length === 10 && <button type="button" className="btn-ghost" disabled={busy} onClick={() => run(async () => setName((await api.post('/restaurant/payments/paystack/resolve', f)).accountName))}>Check account name</button>}
          {name && <Alert kind="ok">Account name: <b>{name}</b>. Make sure this is your business account.</Alert>}
          <Field label="Confirm with your password" hint="Required when changing where your money is sent."><input className="input" type="password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
          <button className="btn-primary" disabled={busy}>Save and connect</button>
        </form>
      )}
    </div>
  );
}

/* ---------------- Payments ---------------- */
export function Payments() {
  const { data, reload } = useDash(); const [p, setP] = useState(null); const [msg, setMsg] = useState(null);
  const [bank, setBank] = useState({ bankName: '', accountName: '', accountNumber: '', enabled: true, acknowledged: false });
  const load = () => api.get('/restaurant/payments').then(setP);
  useEffect(() => { load(); }, []);
  if (!p) return <Spinner />;
  const ps = { not_configured: ['gray', 'Not configured'], pending: ['amber', 'Pending verification'], active: ['green', 'Active'], attention: ['red', 'Needs attention'] }[p.paystack.status];
  const saveBank = async (e) => { e.preventDefault(); setMsg(null); try { await api.put('/restaurant/payments/bank', bank); await reload(); await load(); setBank({ ...bank, accountNumber: '' }); setMsg({ kind: 'ok', text: 'Bank transfer details saved.' }); } catch (x) { setMsg({ kind: 'error', text: x.message }); } };
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      <div className="card p-6">
        <div className="flex items-center justify-between"><h3 className="font-bold">Paystack online payments <Badge color="green">Recommended</Badge></h3><Badge color={ps[0]}>{ps[1]}</Badge></div>
        <p className="mt-2 text-sm text-ink-500">Payments are verified server-side, so orders are only marked paid when Paystack confirms. Proceeds go to your own approved Paystack arrangement. {data.plan?.commissionPct > 0 ? `On your Free plan Ordarly keeps ${data.plan.commissionPct}% of the meal subtotal (never the delivery fee) of each completed order, taken automatically from the payment. ` : 'Ordarly takes no commission, and '}the processing fee is borne by your restaurant. Settlement timing is controlled by Paystack, not Ordarly.</p>
        <PaystackConnect p={p} reload={async () => { await load(); await reload(); }} setMsg={setMsg} enabled={data.restaurant.payments.paystackEnabled} />
      </div>
      {!data.isPro && <ProLock title="Bank transfer and pay on delivery">Free restaurants take online (Paystack) payments. Upgrade to Pro to also accept bank transfers and pay on delivery, with 0% Ordarly commission.</ProLock>}
      {data.isPro && <form onSubmit={saveBank} className="card space-y-4 p-6">
        <div className="flex items-center justify-between"><h3 className="font-bold">Bank transfer</h3>{p.bank && <Badge color={data.restaurant.payments.bankTransferEnabled ? 'green' : 'gray'}>{data.restaurant.payments.bankTransferEnabled ? 'Enabled' : 'Disabled'}</Badge>}</div>
        {p.bank && <div className="rounded-2xl bg-mint-50 p-3 text-sm">{p.bank.bankName} · {p.bank.accountName} · {p.bank.accountNumber}</div>}
        <Alert kind="info">Bank details you provide do not give automatic confirmation that a transfer happened. A customer's screenshot never marks an order paid. You must check your own bank records before accepting a proof.</Alert>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Bank name"><input className="input" required value={bank.bankName} onChange={(e) => setBank({ ...bank, bankName: e.target.value })} /></Field>
          <Field label="Account name"><input className="input" required value={bank.accountName} onChange={(e) => setBank({ ...bank, accountName: e.target.value })} /></Field>
          <Field label="Account number"><input className="input" required inputMode="numeric" maxLength={10} value={bank.accountNumber} onChange={(e) => setBank({ ...bank, accountNumber: e.target.value })} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={bank.enabled} onChange={(e) => setBank({ ...bank, enabled: e.target.checked })} /> Show bank transfer at checkout</label>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={bank.acknowledged} onChange={(e) => setBank({ ...bank, acknowledged: e.target.checked })} /> I understand transfers are not automatically verified.</label>
        <button className="btn-primary" disabled={!bank.acknowledged}>Save bank details</button>
        <p className="text-xs text-ink-500">Customers upload a screenshot after transferring. You review it under Orders, check your own bank records, then accept or reject. Nothing is marked paid until you accept.</p>
      </form>}
      {data.isPro && <div className="card flex items-center justify-between gap-4 p-6">
        <div><h3 className="font-bold">Pay on delivery</h3><p className="text-sm text-ink-500">Delivery orders only. Stays “Unpaid” until you mark cash collected.</p></div>
        <input type="checkbox" className="h-5 w-5" checked={data.restaurant.payments.podEnabled} onChange={async (e) => { await api.put('/restaurant/payments/toggles', { podEnabled: e.target.checked }); reload(); }} />
      </div>}
    </div>
  );
}

/* ---------------- QR ---------------- */
export function QR() {
  const { data } = useDash(); const ref = useRef(); const [url] = useState(data.publicUrl);
  useEffect(() => { if (data.isPro && ref.current) loadQR().then((QRCode) => ref.current && QRCode.toCanvas(ref.current, url, { width: 260, margin: 2, color: { dark: '#12182b' } })); }, [data.isPro, url]);
  if (!data.isPro) return <ProLock title="QR code download" />;
  const download = async () => { const QRCode = await loadQR(); const png = await QRCode.toDataURL(url, { width: 2000, margin: 4, errorCorrectionLevel: 'H', color: { dark: '#12182b' } }); const a = document.createElement('a'); a.href = png; a.download = `${data.restaurant.slug}-qr.png`; a.click(); };
  return (
    <div className="mx-auto max-w-md"><div className="card p-8 text-center">
      <canvas ref={ref} className="mx-auto rounded-2xl" /><div className="mt-3 break-all text-sm text-ink-500">{url}</div>
      <button className="btn-primary mt-5" onClick={download}>Download high-resolution PNG</button>
      <p className="mt-3 text-xs text-ink-500">This points to your page link, so it keeps working when you change your menu. If you change your page link or custom domain, download a new code.</p>
    </div></div>
  );
}

/* ---------------- Analytics ---------------- */
export function Analytics() {
  const { data, branches } = useDash(); const [a, setA] = useState(null); const [branch, setBranch] = useState('');
  useEffect(() => { setA(null); api.get(`/restaurant/analytics${branch ? `?branch=${branch}` : ''}`).then(setA); }, [branch]);
  if (!a) return <Spinner />;
  return (
    <div className="space-y-5">
      {data.isBusiness && branches.length > 0 && <select className="input !w-auto" value={branch} onChange={(e) => setBranch(e.target.value)} aria-label="Branch"><option value="">All branches</option>{branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}</select>}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4"><Stat label="Orders today" value={a.today} /><Stat label="Last 7 days" value={a.week} /><Stat label="Completed" value={a.completed} /><Stat label="Cancelled" value={a.cancelled} tone="bg-red-50 text-red-500" /></div>
      {(<>
        <div className="grid gap-4 md:grid-cols-3">
          <Stat label="Collected online (Paystack)" value={naira(a.collectedOnline)} /><Stat label="Upcoming scheduled orders" value={a.upcomingScheduled || 0} tone="bg-violet-50 text-violet-700" /><Stat label="Bank transfers manually verified" value={naira(a.manuallyVerified)} tone="bg-sky-50 text-sky-600" /><Stat label="Pay-on-delivery awaiting collection" value={naira(a.podAwaitingCollection)} tone="bg-amber-50 text-amber-600" />
        </div>
        <p className="text-xs text-ink-500">Unpaid orders are never counted as collected revenue. Figures come from your real orders.</p>
        <div className="grid gap-4 md:grid-cols-3">
          {[['Popular meals', a.popular.map((p) => [p._id, `${p.qty} sold`])], ['By fulfilment', a.byFulfillment.map((p) => [(p._id || '—').replace('_', ' '), p.n])], ['By payment method', a.byPayment.map((p) => [(p._id || '—').replace('_', ' '), p.n])]].map(([t, rows]) => (
            <div key={t} className="card p-5"><div className="mb-2 font-bold">{t}</div>{rows.length ? rows.map(([k, v]) => <div key={k} className="flex justify-between border-t border-black/5 py-2 text-sm"><span>{k}</span><b>{v}</b></div>) : <p className="text-sm text-ink-500">No data yet.</p>}</div>
          ))}
        </div></>)}
    </div>
  );
}

/* ---------------- Subscription ---------------- */
export function Subscription() {
  const { data, reload } = useDash(); const [s, setS] = useState(null); const [msg, setMsg] = useState(null); const [busy, setBusy] = useState(false); const [interval, setInterval_] = useState('monthly');
  const load = () => api.get('/subscription').then(setS);
  useEffect(() => {
    load();
    // Returning from Paystack (?ref=SUB-...): ask OUR server to verify with Paystack. Changed: it now retries for ~30s (bank transfers can take a
    // few seconds to settle) and shows the real error if the request fails (it used to ignore failures, which left the page "pending" with no clue why).
    const ref = new URLSearchParams(location.search).get('ref');
    if (ref) {
      let stop = false, tries = 0;
      setMsg({ kind: 'info', text: 'Confirming your payment…' });
      const check = async () => {
        if (stop) return; tries += 1;
        try {
          const r = await api.post('/subscription/verify', { reference: ref });
          if (stop) return;
          if (r.status === 'success') { setMsg({ kind: 'ok', text: 'Payment verified. Your plan is active.' }); history.replaceState(null, '', location.pathname); reload(); load(); return; }
          if (r.status === 'failed') { setMsg({ kind: 'error', text: 'Payment failed or was cancelled. You were not charged for this attempt.' }); load(); return; }
          if (r.message && tries >= 3) setMsg({ kind: 'info', text: r.message });
        } catch (e) {
          if (e.status === 401) { setMsg({ kind: 'error', text: 'Please sign in again, then open Subscription to finish confirming your payment.' }); return; }
          if (tries >= 3) setMsg({ kind: 'error', text: `We could not confirm your payment yet: ${e.message}` });
        }
        if (tries < 10) setTimeout(check, 3000);
        else { setMsg({ kind: 'info', text: 'Still confirming. Use "Check status" next to the payment below, or come back in a minute. Nothing is lost.' }); load(); }
      };
      check();
      return () => { stop = true; };
    }
    return undefined;
  }, []);
  if (!s) return <Spinner />;
  const sub = s.subscription;
  const run = async (fn) => { setBusy(true); setMsg(null); try { await fn(); } catch (e) { setMsg({ kind: 'error', text: e.message }); } finally { setBusy(false); } };
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      <div className="rounded-4xl bg-night p-7 text-white">
        <div className="flex items-center justify-between"><div className="text-sm text-white/60">Current plan</div><span className="rounded-full bg-white/10 px-3 py-1 text-xs">{sub?.status || 'free'}</span></div>
        <div className="mt-1 font-display text-4xl font-bold">{({ business: 'Business', pro: 'Pro', free: 'Free' })[s.plan || (s.isPro ? 'pro' : 'free')]}</div>
        <div className="mt-2 text-sm text-white/70">
          {sub?.status === 'trialing' && `Trial ends ${new Date(sub.trialEnd).toDateString()}`}
          {sub?.status === 'active' && `Active until ${new Date(sub.periodEnd).toDateString()}`}
          {sub?.status === 'expired' && 'Your paid plan expired. Your data is safe.'}
          {(!sub || sub.status === 'free') && `Free: ${s.plans.free.commissionPct}% commission on the meal subtotal of completed orders. Delivery fees are always yours.`}
        </div>
      </div>

      <div role="radiogroup" aria-label="Billing period" className="mx-auto flex w-fit rounded-full bg-white p-1 text-sm shadow-soft">
        {[['monthly', 'Monthly'], ['yearly', `Yearly · save ${s.plans.pro.yearly.discountPct}%`]].map(([k, l]) => (
          <label key={k} className={`cursor-pointer rounded-full px-4 py-1.5 font-semibold ${interval === k ? 'bg-night text-white' : 'text-ink-500'}`}><input type="radio" name="interval" className="sr-only" checked={interval === k} onChange={() => setInterval_(k)} />{l}</label>))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {(() => {
          const cur = s.plan || (s.isPro ? 'pro' : 'free');
          const price = (pl) => (interval === 'yearly' ? pl.yearly.price : pl.price);
          const unit = interval === 'yearly' ? '/year' : '/month';
          const buy = (plan) => run(async () => { const r = await api.post('/subscription/checkout', { plan, interval }); location.href = r.authorizationUrl; });
          const Card = ({ id, title, tag, children, cta }) => (
            <div className={`card flex flex-col p-5 ${cur === id ? 'ring-2 ring-brand-500' : ''}`}><div className="flex items-center justify-between"><h3 className="font-bold">{title}</h3>{cur === id && <Badge color="green">Current</Badge>}</div>{tag}<ul className="mt-3 flex-1 space-y-1.5 text-sm text-ink-500">{children}</ul><div className="mt-4">{cta}</div></div>);
          return (<>
            <Card id="free" title="Free" tag={<div className="mt-1 font-display text-2xl font-bold">₦0<span className="text-sm font-normal text-ink-500"> /month</span></div>} cta={cur === 'free' ? <div className="text-center text-xs text-ink-500">Your current plan</div> : null}>
              <li>✓ {s.plans.free.commissionPct}% commission on meal subtotal only</li><li>✓ No commission on delivery fees</li><li>✓ Own ordering website, menu, add-ons & sizes</li><li>✓ Online payment, delivery, pickup, dine-in, tracking</li><li>✓ Orders, WhatsApp alerts, earnings & analytics</li><li className="text-ink-300">✗ No custom domain, bank transfer or pay on delivery</li></Card>
            <Card id="pro" title="Pro" tag={<div className="mt-1 font-display text-2xl font-bold">{naira(price(s.plans.pro))}<span className="text-sm font-normal text-ink-500"> {unit}</span></div>}
              cta={cur === 'business' ? <div className="text-center text-xs text-ink-500">Included in Business</div> : <button className="btn-accent w-full" disabled={busy} onClick={() => buy('pro')}>{cur === 'pro' ? 'Renew / extend' : 'Upgrade to Pro'}</button>}>
              <li>✓ {s.plans.pro.commissionPct}% Ordarly commission</li><li>✓ Custom domain</li><li>✓ Bank-account payment option</li><li>✓ Pay on delivery</li><li>✓ QR codes & everything in Free</li></Card>
            <Card id="business" title="Business / Multi-branch" tag={s.plans.business.open ? <div className="mt-1 font-display text-2xl font-bold">{naira(price(s.plans.business))}<span className="text-sm font-normal text-ink-500"> {unit}</span></div> : <div className="mt-1 font-display text-2xl font-bold">Custom</div>}
              cta={s.plans.business.open ? <button className="btn-primary w-full" disabled={busy} onClick={() => buy('business')}>{cur === 'business' ? 'Renew / extend' : 'Upgrade to Business'}</button> : <Link to="/contact" className="btn-primary w-full">Explore Business plan</Link>}>
              <li>✓ Everything in Pro</li><li>✓ Up to {s.plans.business.open ? s.plans.business.maxBranches : 'several'} branches, one dashboard</li><li>✓ Per-branch menus, prices, hours & delivery</li><li>✓ Branch managers & staff with roles</li><li>✓ Branch and combined earnings reports</li></Card>
          </>);
        })()}
      </div>
      {interval === 'yearly' && <p className="text-center text-xs text-ink-500">One payment covers 365 days. Plans do not renew by themselves. Changing plan starts the new plan today.</p>}

      <div className="card p-6"><h3 className="mb-2 font-bold">Subscription payments</h3>
        <p className="mb-3 text-xs text-ink-500">These are your Ordarly subscription payments only, separate from customer food orders.</p>
        {s.payments.length === 0 ? <p className="text-sm text-ink-500">No payments yet.</p> : s.payments.map((p) => (
          <div key={p._id} className="flex items-center justify-between border-t border-black/5 py-2.5 text-sm"><span>{new Date(p.createdAt).toLocaleDateString()} · {p.providerReference}{p.interval === 'yearly' && <span className="ml-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">Yearly</span>}</span><span className="flex items-center gap-2"><b>{naira(p.amount)}</b><Badge color={p.status === 'success' ? 'green' : p.status === 'failed' ? 'red' : 'amber'}>{p.status}</Badge>
            {p.status === 'pending' && (
  <button
    className="text-xs font-semibold text-brand-600 underline"
    disabled={busy}
    onClick={() =>
      run(async () => {
        const r = await api.post('/subscription/verify', {
          reference: p.providerReference,
        });

        setMsg(
          r.status === 'success'
            ? { kind: 'ok', text: 'Payment verified. Your plan is active.' }
            : {
                kind: 'info',
                text:
                  r.message ||
                  (r.status === 'failed'
                    ? 'Paystack says this payment did not go through.'
                    : 'Paystack has not confirmed this payment yet.'),
              }
        );

        await reload();
        await load();
      })
    }
  >
    Check status
  </button>
)}
          </span></div>))}
      </div>
    </div>
  );
}
