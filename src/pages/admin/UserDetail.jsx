import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { Alert, Badge, Field, Spinner } from '../../components/ui';
import { KV, Modal, fmtDate, fmtDateTime, pretty } from '../../components/adminKit';
import { subColor, userStatusColor } from './Users';

export default function UserDetail() {
  const { id } = useParams();
  const [d, setD] = useState(null); const [err, setErr] = useState(''); const [msg, setMsg] = useState(null);
  const [modal, setModal] = useState(null); const [reason, setReason] = useState(''); const [alsoRest, setAlsoRest] = useState(true); const [busy, setBusy] = useState(false);
  const load = useCallback(() => api.get(`/admin/users/${id}`).then(setD).catch((e) => setErr(e.message)), [id]);
  useEffect(() => { load(); }, [load]);
  if (err) return <Alert>{err}</Alert>;
  if (!d) return <Spinner />;
  const { user: u, restaurant: r, subscription: s, stats } = d;

  const run = async (fn, ok) => {
    setBusy(true); setMsg(null);
    try { await fn(); setMsg({ kind: 'ok', text: ok }); setModal(null); setReason(''); await load(); } catch (e) { setMsg({ kind: 'error', text: e.message }); } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link to="/admin/users" className="text-sm text-ink-500 hover:underline">← All users</Link>
      <div className="card flex flex-wrap items-start justify-between gap-4 p-6">
        <div>
          <h1 className="font-display text-2xl font-bold">{u.name}</h1>
          <p className="text-sm text-ink-500">{u.email}{u.phone && ` · ${u.phone}`}</p>
          <div className="mt-2 flex flex-wrap gap-1.5"><Badge color={userStatusColor(u.status)}>{pretty(u.status)}</Badge>{u.role === 'admin' && <Badge color="blue">Admin</Badge>}<Badge color={u.emailVerified ? 'green' : 'amber'}>{u.emailVerified ? 'Email verified' : 'Email not verified'}</Badge></div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!u.emailVerified && <>
            <button className="btn-ghost" disabled={busy} onClick={() => run(() => api.post(`/admin/users/${id}/resend-verification`), 'Verification email sent.')}>Resend verification</button>
            <button className="btn-ghost" disabled={busy} onClick={() => run(() => api.post(`/admin/users/${id}/verify-email`), 'Email marked as verified.')}>Mark verified</button></>}
          {u.status === 'active' ? <button className="btn-ghost !text-red-600" onClick={() => setModal('suspend')}>Suspend</button> : <button className="btn-primary" disabled={busy} onClick={() => run(() => api.post(`/admin/users/${id}/reactivate`), 'Account reactivated.')}>Reactivate</button>}
        </div>
      </div>
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      {u.status === 'suspended' && u.suspendReason && <Alert kind="info"><b>Suspension reason:</b> {u.suspendReason}</Alert>}

      <div className="card p-6"><h2 className="mb-3 font-bold">Account</h2>
        <KV items={[['Joined', fmtDateTime(u.createdAt)], ['Last sign-in', u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : 'Never recorded'], ['Orders received', stats.orders], ['Meals on menu', stats.meals], ['Latest order', stats.lastOrder ? `${stats.lastOrder.reference} · ${fmtDate(stats.lastOrder.createdAt)}` : 'No orders yet'], ['Paystack payouts', pretty(d.paystackStatus)]]} />
        <p className="mt-3 text-xs text-ink-500">Passwords, bank account numbers and API secrets are never shown to admins.</p>
      </div>

      {r && (
        <div className="card p-6">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Restaurant</h2><Link className="text-sm font-semibold text-brand-600" to={`/admin/restaurants/${r._id}`}>Open restaurant →</Link></div>
          <KV items={[['Name', r.name], ['Public page', `/${r.slug}`], ['State', r.state], ['Plan', <Badge key="p" color={r.plan === 'pro' ? 'green' : 'gray'}>{(r.plan || 'free').toUpperCase()}</Badge>], ['Restaurant status', pretty(r.status)], ['Subscription', s ? <Badge key="s" color={subColor(s.status)}>{pretty(s.status)}</Badge> : 'None'], ['Trial ends', s?.trialEnd && fmtDate(s.trialEnd)], ['Period ends', s?.periodEnd && fmtDate(s.periodEnd)], ['Custom domain', r.customDomain]]} />
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <div className="card p-6"><h2 className="mb-3 font-bold">Complaints from this email</h2>
          {d.complaints.length === 0 ? <p className="text-sm text-ink-500">None.</p> : <ul className="space-y-2 text-sm">{d.complaints.map((c) => <li key={c._id}><Link className="font-medium hover:underline" to={`/admin/complaints/${c._id}`}>{c.reference} · {c.subject || pretty(c.kind)}</Link> <Badge>{pretty(c.status)}</Badge></li>)}</ul>}
        </div>
        <div className="card p-6"><h2 className="mb-3 font-bold">Recent emails sent</h2>
          {d.emails.length === 0 ? <p className="text-sm text-ink-500">None.</p> : <ul className="space-y-2 text-sm">{d.emails.map((m) => <li key={m._id} className="flex items-center justify-between gap-2"><span>{pretty(m.type)}<span className="block text-xs text-ink-500">{fmtDateTime(m.createdAt)}</span></span><Badge color={m.status === 'failed' ? 'red' : 'green'}>{pretty(m.status)}</Badge></li>)}</ul>}
        </div>
      </div>
      <div className="card p-6"><h2 className="mb-3 font-bold">Admin actions on this user</h2>
        {d.audits.length === 0 ? <p className="text-sm text-ink-500">No admin actions recorded.</p> : <ul className="space-y-1 text-sm">{d.audits.map((a) => <li key={a._id}>{pretty(a.action)} <span className="text-ink-500">by {a.actor?.name || 'unknown'} · {fmtDateTime(a.createdAt)}</span></li>)}</ul>}
      </div>

      {modal === 'suspend' && (
        <Modal title={`Suspend ${u.name}`} onClose={() => setModal(null)}>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(() => api.post(`/admin/users/${id}/suspend`, { reason, suspendRestaurant: alsoRest }), 'Account suspended.'); }}>
            <p className="text-sm text-ink-500">They won't be able to sign in, and they'll get an email with your reason.</p>
            <Field label="Reason (shown to the user)"><textarea className="input" rows={3} required minLength={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
            {r && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={alsoRest} onChange={(e) => setAlsoRest(e.target.checked)} />Also hide their restaurant page and stop orders</label>}
            <button className="btn-primary w-full !bg-red-600" disabled={busy}>{busy ? 'Suspending…' : 'Suspend account'}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
