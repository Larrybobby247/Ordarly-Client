import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useDash } from '../../components/DashboardLayout';
import { Spinner } from '../../components/ui';

export const Stat = ({ label, value, tone = 'bg-brand-50 text-brand-600' }) => (
  <div className="card p-5"><div className={`mb-3 grid h-9 w-9 place-items-center rounded-xl text-sm font-bold ${tone}`}>●</div><div className="font-display text-3xl font-bold">{value}</div><div className="text-xs text-ink-500">{label}</div></div>
);

export default function Overview() {
  const { data } = useDash(); const [a, setA] = useState(null);
  useEffect(() => { api.get('/restaurant/analytics').then(setA); }, []);
  if (!a) return <Spinner />;
  const r = data.restaurant;
  const todo = [
    !r.whatsapp && ['Add your WhatsApp number so customers can order', '/dashboard/settings'],
    !r.logo && ['Add a logo and cover image', '/dashboard/settings'],
    !data.isPro && ['Try Pro free for 14 days', '/dashboard/subscription'],
  ].filter(Boolean);
  return (
    <div className="space-y-6">
      {todo.length > 0 && (
        <div className="card p-5"><div className="mb-2 font-bold">Setup reminders</div>
          {todo.map(([t, to]) => <Link key={t} to={to} className="flex items-center justify-between border-t border-black/5 py-2.5 text-sm first:border-0"><span>{t}</span><span className="text-brand-600">Fix →</span></Link>)}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total orders" value={a.total} />
        <Stat label="Awaiting action" value={a.awaiting} tone="bg-amber-50 text-amber-600" />
        <Stat label="Completed" value={a.completed} tone="bg-sky-50 text-sky-600" />
        <Stat label="Cancelled" value={a.cancelled} tone="bg-red-50 text-red-500" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Orders today" value={a.today} /><Stat label="Orders last 7 days" value={a.week} />
        <div className="card p-5"><div className="text-xs text-ink-500">Plan</div><div className="font-display text-3xl font-bold">{data.isPro ? 'Pro' : 'Free'}</div>
          <div className="mt-1 text-xs text-ink-500">{data.subscription?.status === 'trialing' ? `Trial ends ${new Date(data.subscription.trialEnd).toDateString()}` : data.subscription?.status === 'active' ? `Renews by ${new Date(data.subscription.periodEnd).toDateString()}` : 'Upgrade to unlock checkout & payments'}</div></div>
      </div>
      <p className="text-xs text-ink-500">Free-plan WhatsApp orders are order <i>requests</i>. They count as confirmed only after you accept them.</p>
    </div>
  );
}
