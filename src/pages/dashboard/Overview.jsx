import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useDash } from '../../components/DashboardLayout';
import { CardSkeleton, RetryError } from '../../components/ui';
import InstallBanner from '../../components/InstallBanner';

export const Stat = ({ label, value, tone = 'bg-brand-50 text-brand-600' }) => (
  <div className="card p-5"><div className={`mb-3 grid h-9 w-9 place-items-center rounded-xl text-sm font-bold ${tone}`}>●</div><div className="font-display text-3xl font-bold">{value}</div><div className="text-xs text-ink-500">{label}</div></div>
);

export default function Overview() {
  const { data, summary } = useDash(); const [a, setA] = useState(null); const [err, setErr] = useState('');
  const load = useCallback(() => { setErr(''); api.get('/restaurant/analytics').then(setA).catch((e) => setErr(e.message)); }, []);
  useEffect(() => { load(); }, [load]);
  // PERF/UX (changed): the page used to show only a spinner until the statistics arrived. Now the tasks, reminders and plan card
  // appear immediately (they already have their data) and only the numbers show skeletons, with a retry button if that request fails.
  const r = data.restaurant;
  const todo = [
    !r.whatsapp && ['Add your WhatsApp number so customers can order', '/dashboard/settings'],
    !r.logo && ['Add a logo and cover image', '/dashboard/settings'],
    !data.isPro && ['Try Pro free for 14 days', '/dashboard/subscription'],
  ].filter(Boolean);
  const review = [
    [summary?.newOrders, 'new order', 'waiting to be accepted', '/dashboard/orders'],
    [summary?.proofsToReview, 'bank-transfer proof', 'to check', '/dashboard/orders'],
    [summary?.unreadMessages, 'unread customer message', 'to answer', '/dashboard/messages'],
    [summary?.activeReports, 'report', 'still open with Ordarly', '/dashboard/reports'],
  ].filter(([n]) => n > 0);
  return (
    <div className="space-y-6">
      <InstallBanner id="dashboard" name="Ordarly" text="Install the app to open your orders in one tap." />
      <div className="card p-5"><div className="mb-2 font-bold">Tasks to review</div>
        {review.length === 0 ? <p className="text-sm text-ink-500">You're all caught up. New orders and messages will show up here.</p>
          : review.map(([n, one, tail, to]) => <Link key={one} to={to} className="flex items-center justify-between gap-3 border-t border-black/5 py-2.5 text-sm first:border-0"><span><span className="mr-2 inline-grid h-6 min-w-6 place-items-center rounded-full bg-tomato-500 px-1.5 text-xs font-bold text-white">{n}</span>{one}{n === 1 ? '' : 's'} {tail}</span><span className="text-brand-600">Open →</span></Link>)}
      </div>
      {todo.length > 0 && (
        <div className="card p-5"><div className="mb-2 font-bold">Setup reminders</div>
          {todo.map(([t, to]) => <Link key={t} to={to} className="flex items-center justify-between border-t border-black/5 py-2.5 text-sm first:border-0"><span>{t}</span><span className="text-brand-600">Fix →</span></Link>)}
        </div>
      )}
      {err && !a ? <RetryError message={err} onRetry={load} /> : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {a ? (<>
            <Stat label="Total orders" value={a.total} />
            <Stat label="Awaiting action" value={a.awaiting} tone="bg-amber-50 text-amber-600" />
            <Stat label="Completed" value={a.completed} tone="bg-sky-50 text-sky-600" />
            <Stat label="Cancelled" value={a.cancelled} tone="bg-red-50 text-red-500" />
          </>) : [0, 1, 2, 3].map((i) => <CardSkeleton key={i} />)}
        </div>)}
      <div className="grid gap-4 md:grid-cols-3">
        {a ? <><Stat label="Orders today" value={a.today} /><Stat label="Orders last 7 days" value={a.week} /></> : <><CardSkeleton /><CardSkeleton /></>}
        <div className="card p-5"><div className="text-xs text-ink-500">Plan</div><div className="font-display text-3xl font-bold">{data.isPro ? 'Pro' : 'Free'}</div>
          <div className="mt-1 text-xs text-ink-500">{data.subscription?.status === 'trialing' ? `Trial ends ${new Date(data.subscription.trialEnd).toDateString()}` : data.subscription?.status === 'active' ? `Renews by ${new Date(data.subscription.periodEnd).toDateString()}` : 'Upgrade to unlock checkout & payments'}</div></div>
      </div>
      <p className="text-xs text-ink-500">Free-plan WhatsApp orders are order <i>requests</i>. They count as confirmed only after you accept them.</p>
    </div>
  );
}
