import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { api, naira, STATES } from '../../lib/api';
import { useDash } from '../../components/DashboardLayout';
import { Alert, Badge, ProLock, Spinner, Field } from '../../components/ui';
import { Stat } from './Overview';

/* ---------------- Fulfillment ---------------- */
export function Fulfillment() {
  const { data } = useDash(); const [d, setD] = useState(null); const [zones, setZones] = useState([]); const [msg, setMsg] = useState(null);
  useEffect(() => { api.get('/restaurant/fulfillment').then((r) => { setD(r.fulfillment); setZones(r.zones); }); }, []);
  if (!data.isPro) return <ProLock title="Delivery, pickup and dine-in">Free restaurants coordinate pickup directly over WhatsApp.</ProLock>;
  if (!d) return <Spinner />;
  const toggleState = (s) => setZones(zones.find((z) => z.state === s) ? zones.filter((z) => z.state !== s) : [...zones, { state: s, fee: 0, active: true }]);
  const save = async () => {
    setMsg(null);
    try { await api.put('/restaurant/fulfillment', d); await api.put('/restaurant/delivery-zones', { zones: zones.map((z) => ({ state: z.state, fee: Number(z.fee) || 0, active: z.active !== false })) }); setMsg({ kind: 'ok', text: 'Saved.' }); }
    catch (e) { setMsg({ kind: 'error', text: e.message }); }
  };
  const T = ({ k, label, desc }) => <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={!!d[k]} onChange={(e) => setD({ ...d, [k]: e.target.checked })} /><span><b>{label}</b><span className="block text-xs text-ink-500">{desc}</span></span></label>;
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      <div className="card space-y-4 p-6"><h3 className="font-bold">Home delivery</h3>
        <T k="deliveryEnabled" label="Offer home delivery" desc="Customers pick a state you serve; the fee below is added to their total." />
        {d.deliveryEnabled && (<>
          <div className="flex flex-wrap gap-1.5">{STATES.map((s) => <button key={s} onClick={() => toggleState(s)} className={`chip ${zones.find((z) => z.state === s) && '!border-brand-500 !bg-brand-50 !text-brand-700'}`}>{s}</button>)}</div>
          <div className="space-y-2">{zones.sort((a, b) => a.state.localeCompare(b.state)).map((z) => (
            <div key={z.state} className="flex items-center gap-3 rounded-2xl bg-mint-50 p-3 text-sm"><b className="w-32">{z.state}</b>₦<input type="number" min="0" className="input !w-32 !py-1.5" value={z.fee} onChange={(e) => setZones(zones.map((x) => (x.state === z.state ? { ...x, fee: e.target.value } : x)))} />
              <button className="ml-auto text-xs text-red-600" onClick={() => toggleState(z.state)}>Remove</button></div>))}
            {zones.length === 0 && <p className="text-xs text-ink-500">Select at least one state. Delivery is hidden at checkout until you add one.</p>}</div>
        </>)}
      </div>
      <div className="card space-y-4 p-6"><h3 className="font-bold">Pickup</h3>
        <T k="pickupEnabled" label="Customer pickup" desc="No delivery fee. Your address is shown to the customer." />
        <textarea className="input" rows={2} placeholder="Collection instructions (optional)" value={d.pickupInstructions || ''} onChange={(e) => setD({ ...d, pickupInstructions: e.target.value })} /></div>
      <div className="card space-y-4 p-6"><h3 className="font-bold">Dine-in</h3>
        <T k="dineInEnabled" label="Eat at the restaurant" desc="Customers order ahead for dining on site. No delivery fee." />
        <T k="askTableNumber" label="Ask for a table number" desc="Optional seating reference." /></div>
      <button className="btn-primary" onClick={save}>Save fulfilment settings</button>
    </div>
  );
}

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
      <div className="text-xs text-ink-500">Money flow: customer pays → Paystack collects and allocates your share to your subaccount (the platform's share is 0%) → Paystack settles to your bank on its own schedule. Collection, allocation and settlement are separate steps; Orderly cannot make settlement instant.</div>
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
  useEffect(() => { if (data.isPro) load(); }, [data.isPro]);
  if (!data.isPro) return <ProLock title="Online payments, bank transfer and pay on delivery" />;
  if (!p) return <Spinner />;
  const ps = { not_configured: ['gray', 'Not configured'], pending: ['amber', 'Pending verification'], active: ['green', 'Active'], attention: ['red', 'Needs attention'] }[p.paystack.status];
  const saveBank = async (e) => { e.preventDefault(); setMsg(null); try { await api.put('/restaurant/payments/bank', bank); await reload(); await load(); setBank({ ...bank, accountNumber: '' }); setMsg({ kind: 'ok', text: 'Bank transfer details saved.' }); } catch (x) { setMsg({ kind: 'error', text: x.message }); } };
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      <div className="card p-6">
        <div className="flex items-center justify-between"><h3 className="font-bold">Paystack online payments <Badge color="green">Recommended</Badge></h3><Badge color={ps[0]}>{ps[1]}</Badge></div>
        <p className="mt-2 text-sm text-ink-500">Payments are verified server-side, so orders are only marked paid when Paystack confirms. Proceeds go to your own approved Paystack arrangement. Orderly takes no commission, and the processing fee is borne by your restaurant. Settlement timing is controlled by Paystack, not Orderly.</p>
        <PaystackConnect p={p} reload={async () => { await load(); await reload(); }} setMsg={setMsg} enabled={data.restaurant.payments.paystackEnabled} />
      </div>
      <form onSubmit={saveBank} className="card space-y-4 p-6">
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
      </form>
      <div className="card flex items-center justify-between gap-4 p-6">
        <div><h3 className="font-bold">Pay on delivery</h3><p className="text-sm text-ink-500">Delivery orders only. Stays “Unpaid” until you mark cash collected.</p></div>
        <input type="checkbox" className="h-5 w-5" checked={data.restaurant.payments.podEnabled} onChange={async (e) => { await api.put('/restaurant/payments/toggles', { podEnabled: e.target.checked }); reload(); }} />
      </div>
    </div>
  );
}

/* ---------------- QR ---------------- */
export function QR() {
  const { data } = useDash(); const ref = useRef(); const [url] = useState(data.publicUrl);
  useEffect(() => { if (data.isPro && ref.current) QRCode.toCanvas(ref.current, url, { width: 260, margin: 2, color: { dark: '#12182b' } }); }, [data.isPro, url]);
  if (!data.isPro) return <ProLock title="QR code download" />;
  const download = async () => { const png = await QRCode.toDataURL(url, { width: 2000, margin: 4, errorCorrectionLevel: 'H', color: { dark: '#12182b' } }); const a = document.createElement('a'); a.href = png; a.download = `${data.restaurant.slug}-qr.png`; a.click(); };
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
  const { data } = useDash(); const [a, setA] = useState(null);
  useEffect(() => { api.get('/restaurant/analytics').then(setA); }, []);
  if (!a) return <Spinner />;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4"><Stat label="Orders today" value={a.today} /><Stat label="Last 7 days" value={a.week} /><Stat label="Completed" value={a.completed} /><Stat label="Cancelled" value={a.cancelled} tone="bg-red-50 text-red-500" /></div>
      {!data.isPro ? <ProLock title="Sales and order analytics" /> : (<>
        <div className="grid gap-4 md:grid-cols-3">
          <Stat label="Collected online (Paystack)" value={naira(a.collectedOnline)} /><Stat label="Bank transfers manually verified" value={naira(a.manuallyVerified)} tone="bg-sky-50 text-sky-600" /><Stat label="Pay-on-delivery awaiting collection" value={naira(a.podAwaitingCollection)} tone="bg-amber-50 text-amber-600" />
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
  const { data, reload } = useDash(); const [s, setS] = useState(null); const [msg, setMsg] = useState(null); const [busy, setBusy] = useState(false);
  const load = () => api.get('/subscription').then(setS);
  useEffect(() => {
    load();
    const ref = new URLSearchParams(location.search).get('ref');
    if (ref) api.post('/subscription/verify', { reference: ref }).then((r) => { setMsg(r.status === 'success' ? { kind: 'ok', text: 'Payment verified. Pro is active.' } : r.status === 'failed' ? { kind: 'error', text: 'Payment failed.' } : { kind: 'info', text: 'We are still confirming your payment. This page will update shortly. Nothing is lost if you close it.' }); reload(); load(); });
  }, []);
  if (!s) return <Spinner />;
  const sub = s.subscription;
  const run = async (fn) => { setBusy(true); setMsg(null); try { await fn(); } catch (e) { setMsg({ kind: 'error', text: e.message }); } finally { setBusy(false); } };
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      <div className="rounded-4xl bg-night p-7 text-white">
        <div className="flex items-center justify-between"><div className="text-sm text-white/60">Current plan</div><span className="rounded-full bg-white/10 px-3 py-1 text-xs">{sub?.status || 'free'}</span></div>
        <div className="mt-1 font-display text-4xl font-bold">{s.isPro ? 'Pro' : 'Free'}</div>
        <div className="mt-2 text-sm text-white/70">
          {sub?.status === 'trialing' && `Trial: ${new Date(sub.trialStart).toDateString()} → ${new Date(sub.trialEnd).toDateString()}`}
          {sub?.status === 'active' && `Active until ${new Date(sub.periodEnd).toDateString()}`}
          {sub?.status === 'expired' && 'Your Pro plan expired. Your data is safe.'}
          {(!sub || sub.status === 'free') && 'Upgrade to unlock checkout, payments, delivery, tracking, QR codes and a custom domain.'}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button className="btn-accent" disabled={busy} onClick={() => run(async () => { const r = await api.post('/subscription/checkout'); location.href = r.authorizationUrl; })}>{s.isPro ? 'Renew / extend' : 'Subscribe'} · {naira(s.price)}/month</button>
          {!sub?.trialUsed && !s.isPro && <button className="btn-ghost !bg-white/10 !text-white !border-white/20" disabled={busy} onClick={() => run(async () => { await api.post('/restaurant/trial'); await reload(); await load(); setMsg({ kind: 'ok', text: '14-day Pro trial started.' }); })}>Start 14-day free trial</button>}
        </div>
      </div>
      <div className="card p-6"><h3 className="mb-2 font-bold">Subscription payments</h3>
        <p className="mb-3 text-xs text-ink-500">These are your Orderly subscription payments only, separate from customer food orders.</p>
        {s.payments.length === 0 ? <p className="text-sm text-ink-500">No payments yet.</p> : s.payments.map((p) => (
          <div key={p._id} className="flex items-center justify-between border-t border-black/5 py-2.5 text-sm"><span>{new Date(p.createdAt).toLocaleDateString()} · {p.providerReference}</span><span className="flex items-center gap-2"><b>{naira(p.amount)}</b><Badge color={p.status === 'success' ? 'green' : p.status === 'failed' ? 'red' : 'amber'}>{p.status}</Badge></span></div>))}
      </div>
    </div>
  );
}
