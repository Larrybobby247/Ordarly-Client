import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, naira } from '../../lib/api';
import { Alert, Badge, Field, Spinner, statusColor, payColor } from '../../components/ui';
import { KV, Modal, fmtDate, fmtDateTime, pretty } from '../../components/adminKit';
import { subColor } from './Users';

export default function RestaurantDetail() {
  const { id } = useParams();
  const [d, setD] = useState(null); const [err, setErr] = useState(''); const [msg, setMsg] = useState(null);
  const [modal, setModal] = useState(null); const [reason, setReason] = useState(''); const [days, setDays] = useState(30); const [busy, setBusy] = useState(false);
  const load = useCallback(() => api.get(`/admin/restaurants/${id}`).then(setD).catch((e) => setErr(e.message)), [id]);
  useEffect(() => { load(); }, [load]);
  if (err) return <Alert>{err}</Alert>;
  if (!d) return <Spinner />;
  const { restaurant: r, subscription: s, stats } = d;
  const isPro = r.plan === 'pro';

  const run = async (fn, ok) => {
    setBusy(true); setMsg(null);
    try { await fn(); setMsg({ kind: 'ok', text: ok }); setModal(null); setReason(''); await load(); } catch (e) { setMsg({ kind: 'error', text: e.message }); } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link to="/admin/restaurants" className="text-sm text-ink-500 hover:underline">← All restaurants</Link>
      <div className="card flex flex-wrap items-start justify-between gap-4 p-6">
        <div>
          <h1 className="font-display text-2xl font-bold">{r.name}</h1>
          <p className="text-sm text-ink-500">/{r.slug}{r.state && ` · ${r.state}`}</p>
          <div className="mt-2 flex flex-wrap gap-1.5"><Badge color={isPro ? 'green' : 'gray'}>{isPro ? 'PRO' : 'FREE'}</Badge><Badge color={r.status === 'active' ? 'green' : 'red'}>{pretty(r.status)}</Badge>{s && <Badge color={subColor(s.status)}>{pretty(s.status)}</Badge>}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {r.status === 'active' ? <button className="btn-ghost !text-red-600" onClick={() => setModal('suspend')}>Suspend</button> : <button className="btn-primary" disabled={busy} onClick={() => run(() => api.post(`/admin/restaurants/${id}/reactivate`), 'Restaurant reactivated.')}>Reactivate</button>}
          {isPro ? <button className="btn-ghost" onClick={() => setModal('revoke')}>Revoke Pro</button> : null}
          <button className="btn-accent" onClick={() => setModal('grant')}>{isPro ? 'Extend Pro' : 'Grant Pro'}</button>
        </div>
      </div>
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      {r.status === 'suspended' && r.suspendReason && <Alert kind="info"><b>Suspension reason:</b> {r.suspendReason}</Alert>}

      <div className="grid gap-4 sm:grid-cols-4">
        {[['Orders', stats.orders], ['Order value', naira(stats.orderValue)], ['Completed', stats.completed], ['Meals', stats.meals]].map(([k, v]) => (
          <div key={k} className="card p-5"><div className="text-xs text-ink-500">{k}</div><div className="mt-1 font-display text-2xl font-bold">{v}</div></div>
        ))}
      </div>

      <div className="card p-6"><h2 className="mb-3 font-bold">Details</h2>
        <KV items={[
          ['Owner', r.owner && <Link key="o" className="text-brand-600 hover:underline" to={`/admin/users/${r.owner._id}`}>{r.owner.name} ({r.owner.email})</Link>],
          ['Business email', r.email], ['Phone', r.phone], ['Address', r.address], ['Public page', `/${r.slug}`],
          ['Custom domain', r.customDomain && `${r.customDomain} (${pretty(r.customDomainStatus)})`],
          ['Radius delivery set up', stats.deliveryConfigured ? 'Yes' : 'No'], ['Cancelled orders', stats.cancelled], ['Paystack payouts', pretty(d.paystackStatus)], ['Created', fmtDateTime(r.createdAt)],
        ]} />
      </div>

      <div className="card p-6"><h2 className="mb-3 font-bold">Subscription</h2>
        {s ? <KV items={[['Status', pretty(s.status)], ['Trial started', s.trialStart && fmtDate(s.trialStart)], ['Trial ends', s.trialEnd && fmtDate(s.trialEnd)], ['Current period ends', s.periodEnd && fmtDate(s.periodEnd)], ['Trial used', s.trialUsed ? 'Yes' : 'No']]} /> : <p className="text-sm text-ink-500">No subscription record yet.</p>}
      </div>

      <div className="card overflow-x-auto p-6"><h2 className="mb-3 font-bold">Recent orders</h2>
        {d.recentOrders.length === 0 ? <p className="text-sm text-ink-500">No orders yet.</p> : (
          <table className="w-full min-w-[480px] text-left text-sm"><tbody>{d.recentOrders.map((o) => (
            <tr key={o._id} className="border-b border-black/5 last:border-0"><td className="py-2 font-semibold">{o.reference}</td><td>{pretty(o.channel)}</td><td><Badge color={statusColor(o.status)}>{pretty(o.status)}</Badge></td><td>{o.channel === 'checkout' && <Badge color={payColor(o.paymentStatus)}>{pretty(o.paymentStatus)}</Badge>}</td><td className="text-right font-semibold">{naira(o.total)}</td><td className="pl-3 text-xs text-ink-500">{fmtDate(o.createdAt)}</td></tr>
          ))}</tbody></table>)}
      </div>

      {modal === 'suspend' && (
        <Modal title={`Suspend ${r.name}`} onClose={() => setModal(null)}>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(() => api.post(`/admin/restaurants/${id}/suspend`, { reason }), 'Restaurant suspended.'); }}>
            <p className="text-sm text-ink-500">The public page stops taking orders. The owner can still sign in.</p>
            <Field label="Reason"><textarea className="input" rows={3} required minLength={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
            <button className="btn-primary w-full !bg-red-600" disabled={busy}>{busy ? 'Suspending…' : 'Suspend restaurant'}</button>
          </form>
        </Modal>
      )}
      {(modal === 'grant' || modal === 'revoke') && (
        <Modal title={modal === 'grant' ? 'Grant Pro access' : 'Revoke Pro access'} onClose={() => setModal(null)}>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(() => api.post(`/admin/restaurants/${id}/plan`, modal === 'grant' ? { action: 'grant_pro', days: Number(days), reason } : { action: 'revoke_pro', reason }), modal === 'grant' ? 'Pro access granted.' : 'Pro access revoked.'); }}>
            <Alert kind="info">{modal === 'grant' ? 'This is a manual grant. No payment is recorded, and it will not count as revenue.' : 'The restaurant goes back to the Free plan straight away. Its Pro-only data is kept but hidden.'}</Alert>
            {modal === 'grant' && <Field label="Days of Pro"><input type="number" className="input" min={1} max={365} required value={days} onChange={(e) => setDays(e.target.value)} /></Field>}
            <Field label="Reason (kept in the audit log)"><textarea className="input" rows={2} required minLength={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
            <button className="btn-primary w-full" disabled={busy}>{busy ? 'Saving…' : 'Confirm'}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
