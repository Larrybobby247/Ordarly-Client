import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api, naira } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Badge, Spinner, Logo, Alert } from '../../components/ui';
import { Stat } from '../dashboard/Overview';

export default function Admin() {
  const { user, loading, logout } = useAuth(); const go = useNavigate();
  const [logs, setLogs] = useState(null);
  const [s, setS] = useState(null); const [rs, setRs] = useState([]); const [plans, setPlans] = useState(null); const [q, setQ] = useState(''); const [msg, setMsg] = useState('');
  const load = () => { api.get('/admin/stats').then(setS); api.get('/admin/restaurants?q=' + encodeURIComponent(q)).then(setRs); api.get('/admin/plans').then(setPlans); Promise.all([api.get('/admin/error-logs'), api.get('/admin/email-failures'), api.get('/admin/payment-failures'), api.get('/admin/integration-summary')]).then(([errors, emails, pay, integ]) => setLogs({ errors, emails, pay, integ })); };
  useEffect(() => { if (user?.role === 'admin') load(); }, [user, q]);
  if (loading) return <Spinner />;
  if (!user || user.role !== 'admin') return <Navigate to="/login" replace />;
  if (!s || !plans) return <Spinner />;
  return (
    <div className="min-h-screen bg-[#f6f8f4]">
      <header className="flex items-center justify-between border-b bg-white px-6 py-3"><div className="flex items-center gap-3"><Logo /><Badge color="red">ADMIN</Badge></div><button className="btn-ghost" onClick={async () => { await logout(); go('/'); }}>Sign out</button></header>
      <main className="mx-auto max-w-6xl space-y-6 p-6">
        {msg && <Alert kind="ok">{msg}</Alert>}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Restaurants" value={s.restaurants} /><Stat label="Active" value={s.active} /><Stat label="Pro subscribers" value={s.proSubscribers} tone="bg-tomato-50 text-tomato-500" /><Stat label="Active trials" value={s.activeTrials} tone="bg-amber-50 text-amber-600" />
          <Stat label="Subscription revenue" value={naira(s.subscriptionRevenue)} /><Stat label="Total orders" value={s.orders} tone="bg-sky-50 text-sky-600" /><Stat label="Failed emails" value={s.failedEmails} tone="bg-red-50 text-red-500" />
        </div>
        <div className="card p-6"><h3 className="mb-3 font-bold">Plan configuration</h3>
          <form className="flex flex-wrap items-end gap-4" onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.target); await api.put('/admin/plans', { free: { maxActiveMeals: Number(fd.get('meals')) }, pro: { priceNgn: Number(fd.get('price')), trialDays: Number(fd.get('trial')) } }); setMsg('Plans updated and audited.'); load(); }}>
            <label className="text-xs font-semibold">Free active meals<input name="meals" type="number" defaultValue={plans.free.maxActiveMeals} className="input mt-1 !w-32" /></label>
            <label className="text-xs font-semibold">Pro price (₦/month)<input name="price" type="number" defaultValue={plans.pro.priceNgn} className="input mt-1 !w-36" /></label>
            <label className="text-xs font-semibold">Trial days<input name="trial" type="number" defaultValue={plans.pro.trialDays} className="input mt-1 !w-28" /></label>
            <button className="btn-primary">Save</button></form></div>
        {logs && (
          <div className="card p-6"><h3 className="mb-3 font-bold">Support & reliability</h3>
            <div className="grid gap-4 md:grid-cols-4 text-sm">
              <div><div className="mb-1 text-xs font-semibold text-ink-500">Paystack setup status</div>{logs.integ.length ? logs.integ.map((i) => <div key={i._id} className="flex justify-between"><span>{i._id}</span><b>{i.n}</b></div>) : <span className="text-ink-500">None yet</span>}</div>
              <div><div className="mb-1 text-xs font-semibold text-ink-500">Failed payments</div><div>Subscriptions: <b>{logs.pay.subscription.length}</b></div><div>Food orders: <b>{logs.pay.foodOrders.length}</b></div></div>
              <div><div className="mb-1 text-xs font-semibold text-ink-500">Email failures</div>{logs.emails.slice(0, 4).map((e) => <div key={e._id} className="truncate text-xs">{e.type}: {e.lastError}</div>)}{!logs.emails.length && <span className="text-ink-500">None</span>}</div>
              <div><div className="mb-1 text-xs font-semibold text-ink-500">Recent server errors</div>{logs.errors.slice(0, 4).map((e) => <div key={e._id} className="truncate text-xs">{e.method} {e.route}: {e.message}</div>)}{!logs.errors.length && <span className="text-ink-500">None</span>}</div>
            </div></div>
        )}
        <div className="card p-6"><div className="mb-3 flex items-center justify-between"><h3 className="font-bold">Restaurants</h3><input className="input !w-56" placeholder="Search name" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-ink-500"><tr><th className="py-2">Name</th><th>Plan</th><th>Status</th><th>Expires</th><th /></tr></thead><tbody>
            {rs.map((r) => { const sub = r.subscription; const exp = sub?.status === 'trialing' ? sub.trialEnd : sub?.periodEnd; return (
              <tr key={r._id} className="border-t border-black/5"><td className="py-2.5 font-semibold">{r.name}<div className="text-xs font-normal text-ink-500">/{r.slug} · {r.state}</div></td><td><Badge color={r.plan === 'pro' ? 'green' : 'gray'}>{r.plan}{sub?.status === 'trialing' && ' (trial)'}</Badge></td><td><Badge color={r.status === 'active' ? 'green' : 'red'}>{r.status}</Badge></td><td className="text-xs">{exp ? new Date(exp).toLocaleDateString() : '—'}</td>
                <td className="text-right">{r.status === 'active' ? <button className="text-xs text-red-600" onClick={async () => { const reason = prompt('Reason for suspension?'); if (reason) { await api.post(`/admin/restaurants/${r._id}/suspend`, { reason }); load(); } }}>Suspend</button> : <button className="text-xs text-brand-600" onClick={async () => { await api.post(`/admin/restaurants/${r._id}/reactivate`); load(); }}>Reactivate</button>}</td></tr>); })}
          </tbody></table></div></div>
        <p className="text-xs text-ink-500">Admins cannot see passwords, API secrets or full bank details. Sensitive actions are written to the audit log.</p>
      </main>
    </div>
  );
}
