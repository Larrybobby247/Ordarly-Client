import { useCallback, useEffect, useState } from 'react';
import { api, naira } from '../../lib/api';
import { Alert, Badge, CardSkeleton, RetryError } from '../../components/ui';
import { Modal, PageHead, fmtDateTime, pretty } from '../../components/adminKit';

const TABS = [['overview', 'Overview'], ['restaurants', 'Restaurants'], ['packages', 'Credit packages'], ['rules', 'Allowances'], ['purchases', 'Purchases'], ['failed', 'Failed messages'], ['ai', 'AI (Groq)']];
const Stat = ({ k, v }) => <div className="card p-4"><div className="text-xs text-ink-500">{k}</div><div className="mt-1 text-2xl font-bold">{v}</div></div>;

function useGet(path) {
  const [d, setD] = useState(null); const [err, setErr] = useState('');
  const load = useCallback(() => { setErr(''); setD(null); api.get(path).then(setD).catch((e) => setErr(e.message)); }, [path]);
  useEffect(() => { load(); }, [load]);
  return [d, err, load];
}

function Overview() {
  const [d, err, load] = useGet('/admin/whatsapp/overview');
  if (err) return <RetryError message={err} onRetry={load} />; if (!d) return <CardSkeleton lines={4} />;
  const p = d.last30Days;
  return (<div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Stat k="Connected" v={d.connections.connected || 0} /><Stat k="Automation on" v={d.automationOn} /><Stat k="WhatsApp orders (30d)" v={p.whatsappOrders} /><Stat k="Food sales via WhatsApp (30d)" v={naira(p.whatsappFoodRevenue)} />
      <Stat k="Messages sent (30d)" v={p.messagesSent} /><Stat k="Failed messages (30d)" v={p.failedMessages} /><Stat k="Credits used (30d)" v={p.creditsUsed} /><Stat k="Restaurants at zero credits" v={d.restaurantsWithZeroCredits} />
    </div>
    <div className="card p-4 text-sm"><b>Credit sales (30d):</b> {p.creditPurchases.n} purchase(s), {p.creditPurchases.credits} credits, {naira(p.creditPurchases.amount)}</div>
    <div className="card p-4 text-sm"><b>By connection status:</b> {Object.entries(d.connections).map(([k, v]) => <Badge key={k} color={k === 'connected' ? 'green' : 'gray'}>{pretty(k)}: {v}</Badge>)}</div>
  </div>);
}

function RestaurantModal({ id, onClose, onChanged }) {
  const [d, err, load] = useGet(`/admin/whatsapp/restaurants/${id}`);
  const [amount, setAmount] = useState(''); const [pool, setPool] = useState('purchased'); const [reason, setReason] = useState(''); const [msg, setMsg] = useState(null); const [busy, setBusy] = useState(false);
  const run = async (fn) => { setBusy(true); setMsg(null); try { await fn(); await load(); onChanged(); } catch (e) { setMsg({ kind: 'error', text: e.message }); } finally { setBusy(false); } };
  return (
    <Modal title="WhatsApp: restaurant" onClose={onClose} wide>
      {err ? <RetryError message={err} onRetry={load} /> : !d ? <CardSkeleton lines={5} /> : (<div className="space-y-4 text-sm">
        <div><b className="text-base">{d.restaurant.name}</b> <span className="text-ink-500">{d.restaurant.email}</span></div>
        {d.integration ? <div className="grid gap-1 sm:grid-cols-2"><div>Number: <b>{d.integration.displayPhoneNumber || '—'}</b></div><div>Status: <Badge>{pretty(d.integration.connectionStatus)}</Badge></div>
          <div>Automation: <b>{d.integration.automationEnabled ? 'ON' : 'OFF'}</b></div><div>Accept orders: <b>{d.integration.acceptOrdersEnabled ? 'ON' : 'OFF'}</b></div>
          <div>Last webhook: {d.integration.lastWebhookReceivedAt ? fmtDateTime(d.integration.lastWebhookReceivedAt) : '—'}</div><div>WhatsApp orders: {d.whatsappOrders}</div>
          {d.integration.lastError && <div className="sm:col-span-2 text-red-600">Last error: {d.integration.lastError.message}</div>}</div> : <p>Not connected.</p>}
        {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
        {d.integration && (d.integration.suspended?.at
          ? <div className="rounded-2xl bg-red-50 p-3"><b className="text-red-700">Suspended</b>: {d.integration.suspended.reason} <button className="btn-ghost ml-2 !px-3 !py-1 text-xs" disabled={busy} onClick={() => run(() => api.post(`/admin/whatsapp/restaurants/${id}/unsuspend`))}>Unsuspend</button></div>
          : <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); const r = e.target.r.value; run(() => api.post(`/admin/whatsapp/restaurants/${id}/suspend`, { reason: r })); }}><input name="r" required minLength={3} className="input flex-1" placeholder="Reason to suspend WhatsApp" /><button className="btn-dark !px-4 !py-2 text-xs" disabled={busy}>Suspend</button></form>)}
        <div className="rounded-2xl border border-black/10 p-3">
          <div className="mb-2 font-semibold">Credits: {d.wallet.totalAvailable} available ({d.wallet.monthlyRemaining} monthly / {d.wallet.purchasedBalance} bought, {d.wallet.plan} plan)</div>
          <form className="grid gap-2 sm:grid-cols-[110px_130px_1fr_auto]" onSubmit={(e) => { e.preventDefault(); run(async () => { await api.post(`/admin/whatsapp/restaurants/${id}/credits`, { amount: Number(amount), pool, reason }); setAmount(''); setReason(''); setMsg({ kind: 'ok', text: 'Credits adjusted and recorded in the audit log.' }); }); }}>
            <input className="input" type="number" step="1" required placeholder="+50 / -20" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <select className="input" value={pool} onChange={(e) => setPool(e.target.value)}><option value="purchased">Bought pool</option><option value="monthly">Monthly pool</option></select>
            <input className="input" required minLength={3} placeholder="Reason (required, kept in the audit trail)" value={reason} onChange={(e) => setReason(e.target.value)} /><button className="btn-primary !px-4 !py-2 text-xs" disabled={busy}>Adjust</button>
          </form>
        </div>
        <div><b>Recent credit activity</b><ul className="mt-1 divide-y divide-black/5">{d.transactions.map((t) => <li key={t._id} className="flex justify-between gap-3 py-1.5"><span>{pretty(t.transactionType)}{t.adminName ? ` · ${t.adminName}` : ''}{t.reason ? ` · ${t.reason}` : ''}</span><span className="whitespace-nowrap">{t.amount > 0 ? '+' : ''}{t.amount} ({t.previousBalance}→{t.newBalance}) · {fmtDateTime(t.createdAt)}</span></li>)}</ul></div>
        {d.failures.length > 0 && <div><b>Recent failed messages</b><ul className="mt-1 divide-y divide-black/5">{d.failures.map((f) => <li key={f._id} className="py-1.5"><span className="text-red-600">{f.failureReason}</span> <span className="text-xs text-ink-500">{f.failureCode ? `code ${f.failureCode} · ` : ''}{fmtDateTime(f.createdAt)}</span></li>)}</ul></div>}
      </div>)}
    </Modal>);
}

function Restaurants() {
  const [d, err, load] = useGet('/admin/whatsapp/restaurants'); const [open, setOpen] = useState(null);
  if (err) return <RetryError message={err} onRetry={load} />; if (!d) return <CardSkeleton lines={5} />;
  return (<>
    <div className="card overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-ink-500"><tr>{['Restaurant', 'Number', 'Status', 'Auto', 'Orders', 'Credits', 'Last webhook', ''].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead>
      <tbody className="divide-y divide-black/5">{d.restaurants.map((x) => <tr key={x.id} className="cursor-pointer hover:bg-black/5" onClick={() => setOpen(x.id)}>
        <td className="p-3 font-semibold">{x.name}<div className="text-xs font-normal text-ink-500">{x.plan}</div></td><td className="p-3">{x.number || '—'}</td><td className="p-3"><Badge color={x.status === 'connected' ? 'green' : 'gray'}>{x.statusLabel || x.status}</Badge>{x.suspended && <Badge color="red">Suspended</Badge>}</td>
        <td className="p-3">{x.automation ? 'ON' : 'off'}</td><td className="p-3">{x.orders ? 'ON' : 'off'}</td><td className="p-3">{x.creditsLeft ?? '—'}</td><td className="p-3 text-xs">{x.lastWebhook ? fmtDateTime(x.lastWebhook) : '—'}</td><td className="p-3 text-xs text-red-600">{x.lastError}</td></tr>)}
        {d.restaurants.length === 0 && <tr><td className="p-5 text-ink-500" colSpan={8}>No restaurant has connected WhatsApp yet.</td></tr>}</tbody></table></div>
    {open && <RestaurantModal id={open} onClose={() => setOpen(null)} onChanged={load} />}
  </>);
}

function Packages() {
  const [d, err, load] = useGet('/admin/whatsapp/packages'); const [msg, setMsg] = useState(null);
  if (err) return <RetryError message={err} onRetry={load} />; if (!d) return <CardSkeleton lines={4} />;
  const save = async (id, body) => { setMsg(null); try { await api.patch(`/admin/whatsapp/packages/${id}`, body); load(); } catch (e) { setMsg({ kind: 'error', text: e.message }); } };
  const add = async (e) => { e.preventDefault(); const f = e.target; try { await api.post('/admin/whatsapp/packages', { name: f.name.value, credits: Number(f.credits.value) }); f.reset(); load(); } catch (x) { setMsg({ kind: 'error', text: x.message }); } };
  return (<div className="space-y-3">
    <Alert kind="info">Packages start switched off with no price. Set a price above zero, then turn a package on to offer it to restaurants. “Expiry days” empty = bought credits never expire.</Alert>
    {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
    {d.packages.map((p) => <div key={p._id} className="card grid items-end gap-3 p-4 sm:grid-cols-[1fr_110px_130px_110px_auto]">
      <div><div className="font-bold">{p.name}</div><div className="text-xs text-ink-500">{p.credits} credits</div></div>
      <label className="text-xs">Price (₦)<input className="input mt-1" type="number" min="0" defaultValue={p.price} onBlur={(e) => Number(e.target.value) !== p.price && save(p._id, { price: Number(e.target.value) })} /></label>
      <label className="text-xs">Expiry days<input className="input mt-1" type="number" min="1" placeholder="Never" defaultValue={p.expiryDays ?? ''} onBlur={(e) => { const v = e.target.value === '' ? null : Number(e.target.value); if (v !== (p.expiryDays ?? null)) save(p._id, { expiryDays: v }); }} /></label>
      <label className="text-xs">Credits<input className="input mt-1" type="number" min="1" defaultValue={p.credits} onBlur={(e) => Number(e.target.value) !== p.credits && save(p._id, { credits: Number(e.target.value) })} /></label>
      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-4 w-4" checked={p.active} onChange={(e) => save(p._id, { active: e.target.checked })} />On sale</label></div>)}
    <form onSubmit={add} className="card flex flex-wrap items-end gap-3 p-4"><label className="text-xs">Name<input name="name" required className="input mt-1" /></label><label className="text-xs">Credits<input name="credits" type="number" min="1" required className="input mt-1" /></label><button className="btn-primary !px-4 !py-2 text-sm">Add package</button></form>
  </div>);
}

function Rules() {
  const [d, err, load] = useGet('/admin/whatsapp/config'); const [msg, setMsg] = useState(null); const [f, setF] = useState(null);
  useEffect(() => { if (d) setF({ free: d.allowances.free, pro: d.allowances.pro, business: d.allowances.business, hours: d.reservationTimeoutHours, w1: d.warnAtPercent[0], w2: d.warnAtPercent[1], policy: d.purchasedCreditPolicy || '' }); }, [d]);
  if (err) return <RetryError message={err} onRetry={load} />; if (!f) return <CardSkeleton lines={4} />;
  const n = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async (e) => { e.preventDefault(); setMsg(null); try { await api.put('/admin/whatsapp/config', { allowances: { free: +f.free, pro: +f.pro, business: +f.business }, reservationTimeoutHours: +f.hours, warnAtPercent: [+f.w1, +f.w2], purchasedCreditPolicy: f.policy }); setMsg({ kind: 'ok', text: 'Saved. Applies from each restaurant\'s next credit cycle (upgrades top up the difference immediately).' }); } catch (x) { setMsg({ kind: 'error', text: x.message }); } };
  return (<form onSubmit={save} className="card space-y-3 p-5">
    <h4 className="font-bold">Monthly Ordarly credits per plan</h4>
    <div className="grid gap-3 sm:grid-cols-3">{[['free', 'Free'], ['pro', 'Pro'], ['business', 'Business']].map(([k, l]) => <label key={k} className="text-xs">{l}<input className="input mt-1" type="number" min="0" value={f[k]} onChange={n(k)} /></label>)}</div>
    <div className="grid gap-3 sm:grid-cols-3"><label className="text-xs">Release unconfirmed holds after (hours)<input className="input mt-1" type="number" min="1" value={f.hours} onChange={n('hours')} /></label><label className="text-xs">First warning at (% left)<input className="input mt-1" type="number" min="1" max="99" value={f.w1} onChange={n('w1')} /></label><label className="text-xs">Second warning at (% left)<input className="input mt-1" type="number" min="1" max="99" value={f.w2} onChange={n('w2')} /></label></div>
    <label className="block text-xs">Note shown with credit packs (optional)<textarea className="input mt-1" rows={2} maxLength={600} value={f.policy} onChange={n('policy')} /></label>
    {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}<button className="btn-primary">Save</button></form>);
}

function Purchases() {
  const [d, err, load] = useGet('/admin/whatsapp/purchases'); if (err) return <RetryError message={err} onRetry={load} />; if (!d) return <CardSkeleton lines={4} />;
  return <div className="card divide-y divide-black/5 text-sm">{d.purchases.map((p) => <div key={p._id} className="flex flex-wrap justify-between gap-2 p-3"><span><b>{p.restaurant?.name || '—'}</b> · {p.packageName} · {p.credits} credits</span><span>{naira(p.amount)} <Badge color={p.status === 'success' ? 'green' : p.status === 'failed' ? 'red' : 'amber'}>{p.status}</Badge> <span className="text-xs text-ink-500">{fmtDateTime(p.createdAt)} · {p.providerReference}</span></span></div>)}{d.purchases.length === 0 && <p className="p-5 text-ink-500">No purchases yet.</p>}</div>;
}
function Failed() {
  const [d, err, load] = useGet('/admin/whatsapp/failed-messages'); if (err) return <RetryError message={err} onRetry={load} />; if (!d) return <CardSkeleton lines={4} />;
  return <div className="card divide-y divide-black/5 text-sm">{d.messages.map((m) => <div key={m._id} className="p-3"><b>{m.restaurant?.name || '—'}</b> <Badge color="red">{m.failureKind}</Badge> <span className="text-xs text-ink-500">{m.failureCode ? `code ${m.failureCode} · ` : ''}{fmtDateTime(m.createdAt)}</span><div className="text-red-600">{m.failureReason}</div></div>)}{d.messages.length === 0 && <p className="p-5 text-ink-500">No failed messages in the last 14 days.</p>}</div>;
}

// Groq AI help: monitoring, limits and the emergency switch. Counts only; no customer text is shown. Independent of Ordarly credits and Meta billing.
function Ai() {
  const [d, err, load] = useGet('/admin/whatsapp/ai'); const [msg, setMsg] = useState(null); const [lim, setLim] = useState(null);
  if (err) return <RetryError message={err} onRetry={load} />; if (!d) return <CardSkeleton lines={6} />;
  const L = lim || d.limits;
  const act = async (fn, ok) => { setMsg(null); try { await fn(); setMsg({ kind: 'ok', text: ok }); setLim(null); load(); } catch (e) { setMsg({ kind: 'error', text: e.message }); } };
  const num = (k) => (e) => setLim({ ...L, [k]: Number(e.target.value) });
  const b = d.breaker; const t = d.today;
  return (<div className="space-y-4">
    {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
    <div className="grid gap-3 sm:grid-cols-4">
      <Stat k="Provider / model" v={`${d.provider} · ${d.model || 'not set'}`} />
      <Stat k="Status" v={d.limits.disabled ? 'Switched off' : !d.configured ? 'Not configured' : b.state === 'open' ? 'Paused (auto-recovering)' : 'Working'} />
      <Stat k="Requests today" v={t.requests} />
      <Stat k="Avg response" v={t.avgLatencyMs != null ? `${t.avgLatencyMs} ms` : '—'} />
      <Stat k="Failures today" v={t.failed} /><Stat k="Rate-limit events" v={t.rateLimited} /><Stat k="Fallbacks to basic mode" v={t.fallbacks} />
      <Stat k="Tokens today (in / out)" v={`${t.inputTokens} / ${t.outputTokens}`} />
    </div>
    <div className="card space-y-2 p-4 text-sm">
      <div><b>Circuit breaker:</b> {b.state}{b.permanent ? ' (needs attention: key/model problem)' : ''}{b.reason ? ` · ${b.reason}` : ''}{b.openUntil ? ` · until ${fmtDateTime(b.openUntil)}` : ''}</div>
      <div className="text-xs text-ink-500">Last success: {b.lastSuccessAt ? fmtDateTime(b.lastSuccessAt) : '—'} · Last error: {b.lastError?.message || b.lastError?.kind || '—'}. WhatsApp automation is never switched off because of AI problems; it falls back to basic mode.</div>
      <div className="flex flex-wrap gap-2">
        <button className={d.limits.disabled ? 'btn-primary' : 'btn-outline'} onClick={() => window.confirm(d.limits.disabled ? 'Switch AI help back on for all restaurants?' : 'Emergency stop: switch AI help off for ALL restaurants? WhatsApp automation keeps working in basic mode.') && act(() => api.post('/admin/whatsapp/ai/disable', { disabled: !d.limits.disabled }), d.limits.disabled ? 'AI help is on.' : 'AI help is off for everyone.')}>{d.limits.disabled ? 'Switch AI help on' : 'Emergency disable AI'}</button>
        <button className="btn-outline" onClick={() => act(() => api.post('/admin/whatsapp/ai/reset-breaker', {}), 'Breaker reset.')}>Reset breaker</button>
      </div>
    </div>
    <div className="card space-y-3 p-4">
      <h4 className="font-bold">Limits <span className="text-xs font-normal text-ink-500">(0 = no limit; set from your own Groq plan, nothing is assumed)</span></h4>
      <div className="grid gap-3 sm:grid-cols-4 text-sm">
        {[['globalDailyRequests', 'Global requests / day'], ['perRestaurantDailyRequests', 'Per restaurant / day'], ['perRestaurantMonthlyRequests', 'Per restaurant / month'], ['confidenceThreshold', 'Confidence needed to skip AI (0.5 to 0.95)']].map(([k, l]) => <label key={k}><span className="text-xs text-ink-500">{l}</span><input type="number" step={k === 'confidenceThreshold' ? '0.05' : '1'} className="input" value={L[k]} onChange={num(k)} /></label>)}
      </div>
      <button className="btn-primary" disabled={!lim} onClick={() => act(() => api.put('/admin/whatsapp/ai/limits', { globalDailyRequests: L.globalDailyRequests, perRestaurantDailyRequests: L.perRestaurantDailyRequests, perRestaurantMonthlyRequests: L.perRestaurantMonthlyRequests, confidenceThreshold: L.confidenceThreshold }), 'Limits saved.')}>Save limits</button>
    </div>
    <div className="card overflow-x-auto"><div className="p-3 text-sm"><b>By restaurant, last 30 days</b> · {d.restaurantsWithAi} with AI on · {d.restaurantsWithoutAi} connected without AI</div>
      <table className="w-full text-left text-sm"><thead className="text-xs text-ink-500"><tr>{['Restaurant', 'Requests', 'Failed', 'Rate-limited', 'Fallbacks', 'Tokens in / out'].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-black/5">{d.restaurants.map((r) => <tr key={r._id}><td className="p-3">{r.name || '—'}</td><td className="p-3">{r.requests}</td><td className="p-3">{r.failed}</td><td className="p-3">{r.rateLimited}</td><td className="p-3">{r.fallbacks}</td><td className="p-3">{r.inputTokens} / {r.outputTokens}</td></tr>)}{d.restaurants.length === 0 && <tr><td className="p-4 text-ink-500" colSpan={6}>No AI usage yet.</td></tr>}</tbody></table></div>
    <div className="card divide-y divide-black/5 text-sm"><div className="p-3 font-bold">Recent failures</div>{d.recentFailures.map((f) => <div key={f._id} className="flex flex-wrap justify-between gap-2 p-3"><span><Badge color="red">{f.status}</Badge> {f.model}</span><span className="text-xs text-ink-500">{fmtDateTime(f.createdAt)}</span></div>)}{d.recentFailures.length === 0 && <div className="p-3 text-ink-500">None.</div>}</div>
  </div>);
}

export default function AdminWhatsApp() {
  const [tab, setTab] = useState('overview');
  const View = { overview: Overview, restaurants: Restaurants, packages: Packages, rules: Rules, purchases: Purchases, failed: Failed, ai: Ai }[tab];
  return (<div className="space-y-4">
    <PageHead title="WhatsApp Commerce" sub="Connections, Ordarly credits and packages. Meta billing is between each restaurant and Meta." />
    <div className="flex flex-wrap gap-1.5">{TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold ${tab === k ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-black/10 text-ink-500'}`}>{l}</button>)}</div>
    <View />
  </div>);
}
