import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, naira } from '../../lib/api';
import { Alert, Spinner } from '../../components/ui';
import { PageHead } from '../../components/adminKit';

const Tile = ({ label, value, sub, to }) => {
  const inner = <div className="card h-full p-4"><div className="text-xs text-ink-500">{label}</div><div className="mt-1 font-display text-2xl font-bold">{value}</div>{sub && <div className="mt-0.5 text-[11px] text-ink-500">{sub}</div>}</div>;
  return to ? <Link to={to}>{inner}</Link> : inner;
};

// Platform-wide money and plan numbers. Everything comes from the ledger and payment records on the server.
export default function Revenue() {
  const [d, setD] = useState(null); const [ret, setRet] = useState([]); const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const load = useCallback(() => Promise.all([api.get('/admin/revenue'), api.get('/admin/commission-returns')]).then(([a, b]) => { setD(a); setRet(b.rows); }).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);
  if (err && !d) return <Alert>{err}</Alert>;
  if (!d) return <Spinner />;
  const mark = async (id) => { setErr(''); try { await api.post(`/admin/ledger/${id}/returned`, {}); setOk('Marked as returned.'); load(); } catch (e) { setErr(e.message); } };
  const c = d.commission, p = d.restaurantsByPlan;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHead title="Revenue & commission" sub="Plans, subscription revenue, commission and platform activity." />
      {err && <Alert>{err}</Alert>}{ok && <Alert kind="ok">{ok}</Alert>}

      <section><h2 className="mb-2 font-bold">Commission</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Tile label="Total commission earned" value={naira(c.total)} sub={`${c.orders.toLocaleString('en-NG')} completed orders`} />
          <Tile label="Commission this month" value={naira(c.month)} />
          <Tile label="Held (orders not yet completed)" value={naira(c.pending)} sub={`${c.pendingOrders} paid order(s)`} />
          <Tile label="To return to restaurants" value={naira(c.toReturn)} sub={`${c.toReturnCount} cancelled/refunded order(s)`} />
        </div></section>

      <section><h2 className="mb-2 font-bold">Subscription revenue</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Tile label="Pro: this month" value={naira(d.subscriptionRevenue.pro.month)} sub={`All time ${naira(d.subscriptionRevenue.pro.total)}`} />
          <Tile label="Business: this month" value={naira(d.subscriptionRevenue.business.month)} sub={`All time ${naira(d.subscriptionRevenue.business.total)}`} />
          <Tile label="Upgrades (30 days)" value={d.upgrades30d} sub="First paid plan" />
          <Tile label="Cancellations / expiries (30 days)" value={d.cancellations30d} />
        </div></section>

      <section><h2 className="mb-2 font-bold">Restaurants</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Tile label="Free" value={p.free} to="/admin/restaurants?plan=free" /><Tile label="Pro" value={p.pro} to="/admin/restaurants?plan=pro" /><Tile label="Business" value={p.business} to="/admin/restaurants?plan=business" />
          <Tile label="Active (ordered in 30 days)" value={d.activeRestaurants30d} />
          <Tile label="Completed orders" value={d.completedOrders.count.toLocaleString('en-NG')} sub={`Value ${naira(d.completedOrders.value)}`} />
        </div>
        <p className="mt-2 text-xs text-ink-500">This month: {d.completedOrders.monthCount.toLocaleString('en-NG')} completed orders worth {naira(d.completedOrders.monthValue)}.</p></section>

      <section><h2 className="mb-2 font-bold">Scheduled orders</h2>
        <div className="grid gap-3 sm:grid-cols-3"><Tile label="Upcoming" value={d.scheduled.upcoming} /><Tile label="Due in the next 24 hours" value={d.scheduled.next24h} /><Tile label="All scheduled orders" value={d.scheduled.total} sub={Object.entries(d.scheduled.byStatus).map(([k, v]) => `${k.replace('_', ' ')} ${v}`).join(' · ')} /></div></section>

      <section className="card p-5"><h2 className="font-bold">Commission to return</h2>
        <p className="mb-3 text-xs text-ink-500">Commission is taken from the payment when the customer pays. If the order is then cancelled or refunded, that commission is owed back to the restaurant. Pay it back outside Ordarly, then mark it returned here (recorded in the audit log).</p>
        {ret.length === 0 ? <p className="text-sm text-ink-500">Nothing to return.</p> : <div className="divide-y divide-black/5">{ret.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"><span><b>{r.orderRef}</b> <span className="text-ink-500">· {r.restaurant || 'Restaurant'}</span></span><span className="flex items-center gap-3"><b>{naira(r.due)}</b><button className="btn-ghost !py-1 !text-xs" onClick={() => { if (confirm(`Mark ${naira(r.due)} as returned to ${r.restaurant}?`)) mark(r.id); }}>Mark returned</button></span></div>))}</div>}
      </section>
    </div>
  );
}
