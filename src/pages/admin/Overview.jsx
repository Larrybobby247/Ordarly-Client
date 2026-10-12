import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, naira } from '../../lib/api';
import { Spinner, Alert } from '../../components/ui';
import { PageHead } from '../../components/adminKit';

const Tile = ({ label, value, sub, to }) => {
  const body = (<><div className="text-xs text-ink-500">{label}</div><div className="mt-1 font-display text-3xl font-bold">{value}</div>{sub && <div className="mt-1 text-xs text-ink-500">{sub}</div>}</>);
  return to ? <Link to={to} className="card block p-5 transition hover:border-brand-500/40">{body}</Link> : <div className="card p-5">{body}</div>;
};

export default function Overview() {
  const [s, setS] = useState(null); const [err, setErr] = useState('');
  useEffect(() => { api.get('/admin/stats').then(setS).catch((e) => setErr(e.message)); }, []);
  if (err) return <Alert>{err}</Alert>;
  if (!s) return <Spinner />;
  const attention = [
    s.openComplaints > 0 && ['/admin/complaints', `${s.openComplaints} open complaint${s.openComplaints > 1 ? 's' : ''} waiting for a reply`],
    s.failedPayments24h > 0 && ['/admin/logs', `${s.failedPayments24h} failed payment${s.failedPayments24h > 1 ? 's' : ''} in the last 24 hours`],
    s.failedEmails > 0 && ['/admin/emails?status=failed', `${s.failedEmails} email${s.failedEmails > 1 ? 's' : ''} failed to send`],
    s.expiringSoon > 0 && ['/admin/subscriptions', `${s.expiringSoon} subscription${s.expiringSoon > 1 ? 's' : ''} ending within 7 days`],
    s.suspendedRestaurants > 0 && ['/admin/restaurants?status=suspended', `${s.suspendedRestaurants} suspended restaurant${s.suspendedRestaurants > 1 ? 's' : ''}`],
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHead title="Overview" sub="A snapshot of the whole platform." />
      <section aria-label="Needs attention" className="card mb-6 p-5">
        <h2 className="mb-2 font-bold">Needs attention</h2>
        {attention.length === 0 ? <p className="text-sm text-ink-500">Nothing needs your attention right now.</p> : (
          <ul className="space-y-1.5 text-sm">{attention.map(([to, t]) => <li key={to}><Link className="font-medium text-tomato-600 hover:underline" to={to}>{t} →</Link></li>)}</ul>
        )}
      </section>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Restaurant owners" value={s.users.toLocaleString()} sub={`${s.newUsers7} new in the last 7 days`} to="/admin/users" />
        <Tile label="Restaurants" value={s.restaurants.toLocaleString()} sub={`${s.activeRestaurants} active · ${s.suspendedRestaurants} suspended`} to="/admin/restaurants" />
        <Tile label="Pro subscribers" value={s.proSubscribers} sub={`${s.activeTrials} on trial · ${s.expiredSubs} expired`} to="/admin/subscriptions" />
        <Tile label="Orders" value={s.orders.toLocaleString()} sub={`${s.ordersToday} today`} to="/admin/analytics" />
        <Tile label="Subscription revenue (this month)" value={naira(s.subscriptionRevenueMonth)} sub={`${naira(s.subscriptionRevenue)} all time`} to="/admin/transactions" />
        <Tile label="Open complaints" value={s.openComplaints} to="/admin/complaints" />
        <Tile label="Failed emails" value={s.failedEmails} to="/admin/emails?status=failed" />
        <Tile label="Failed payments (24h)" value={s.failedPayments24h} to="/admin/logs" />
      </div>
      <p className="mt-4 text-xs text-ink-500">Revenue shows Pro subscription payments only. Food-order payments belong to the restaurants and are never counted as platform revenue.</p>
    </div>
  );
}
