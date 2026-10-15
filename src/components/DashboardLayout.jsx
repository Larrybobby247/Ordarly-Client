import { useCallback, useEffect, useMemo, useState, createContext, useContext } from 'react';
import { useNavigate, Navigate, Outlet } from 'react-router-dom';
import Shell from './Shell';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Logo, Spinner } from './ui';
import NotifyBanner from './NotifyBanner';
import { useVisibleInterval } from '../lib/hooks';
import InstallBanner from './InstallBanner';

const DashCtx = createContext(null);
export const useDash = () => useContext(DashCtx);

const nav = [
  ['/dashboard', 'Overview', 'M3 12l9-9 9 9M5 10v10h14V10', true],
  ['/dashboard/orders', 'Orders', 'M6 2h12l2 5H4zM4 7v13h16V7', false, 'orders'],
  ['/dashboard/menu', 'Menu', 'M4 6h16M4 12h16M4 18h10'],
  ['/dashboard/messages', 'Messages', 'M4 5h16v11H9l-5 4zM8 9h8M8 12h5', false, 'messages'],
  ['/dashboard/reports', 'Reports', 'M5 21V4h11l-1 4 4 2H5', false, 'reports'],
  ['/dashboard/fulfillment', 'Delivery & Pickup', 'M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 100-4 2 2 0 000 4zM17 19a2 2 0 100-4 2 2 0 000 4z'],
  ['/dashboard/payments', 'Payments', 'M3 6h18v12H3zM3 10h18'],
  ['/dashboard/qr', 'QR Code', 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2z'],
  ['/dashboard/analytics', 'Analytics', 'M4 20V10M10 20V4M16 20v-8M22 20H2'],
  ['/dashboard/subscription', 'Subscription', 'M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z'],
  ['/dashboard/settings', 'Settings', 'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 00-2-1.2L14 3h-4l-.5 2.6a7 7 0 00-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 005 12'],
];

export default function DashboardLayout() {
  const { user, loading, logout } = useAuth(); const go = useNavigate();
  const [data, setData] = useState(null); const [note, setNote] = useState(''); const [sum, setSum] = useState({});
  useEffect(() => { api.get('/public/platform', { ttl: 5 * 60 * 1000 }).then((p) => setNote(p.announcement?.enabled ? p.announcement.text : '')).catch(() => {}); }, []);
  const load = useCallback(() => api.get('/restaurant').then(setData).catch(() => {}), []);
  const refreshSummary = useCallback(() => api.get('/inbox/summary').then(setSum).catch(() => {}), []);
  useEffect(() => { if (user) load(); }, [user, load]);
  useEffect(() => {
    if (user?.role !== 'owner') return undefined;
    refreshSummary();
  }, [user, refreshSummary]);
  // PERF (changed): counters refresh every 20s only while the tab is visible (previously also in background tabs).
  useVisibleInterval(() => { if (user?.role === 'owner') refreshSummary(); }, 20000);
  const ctx = useMemo(() => ({ data, reload: load, summary: sum, refreshSummary }), [data, load, sum, refreshSummary]);
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;

  const sub = data?.subscription;
  const banner = data && (data.isPro && sub?.status === 'trialing'
    ? `Pro trial: ${Math.max(0, Math.ceil((new Date(sub.trialEnd) - Date.now()) / 86400000))} day(s) left`
    : !data.isPro && sub?.status === 'expired' ? 'Your Pro plan has expired. Upgrade to restore Pro features.' : null);

  return (
    <DashCtx.Provider value={ctx}>
      <Shell nav={nav} badges={{ orders: sum.newOrders, messages: sum.unreadMessages, reports: sum.activeReports }} brand={<Logo />}
        sidebarExtra={data && (
          <a href={data.publicUrl} target="_blank" rel="noreferrer" className="block rounded-3xl bg-night p-4 text-xs text-white">
            <div className="text-white/60">Your public page</div><div className="mt-1 break-all font-semibold">{data.publicUrl.replace(/^https?:\/\//, '')}</div><div className="mt-2 text-brand-100">Open ↗</div>
          </a>)}
        topLeft={<div className="hidden md:block"><div className="font-display text-xl font-bold">Hello, {user.name.split(' ')[0]} 👋</div><div className="truncate text-xs text-ink-500">{data?.restaurant.name}</div></div>}
        topRight={<>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${data?.isPro ? 'bg-tomato-50 text-tomato-600' : 'bg-slate-100 text-slate-600'}`}>{data?.isPro ? 'PRO' : 'FREE'}</span>
          <button onClick={async () => { await logout(); go('/'); }} className="btn-ghost !py-1.5">Sign out</button></>}
        banners={<>
          <NotifyBanner compact />
          {note && <div className="shrink-0 bg-sky-50 px-4 py-2 text-center text-sm font-medium text-sky-800 md:px-8">{note}</div>}
          {banner && <div className="shrink-0 bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-800 md:px-8">{banner}</div>}</>}>
        {data ? <Outlet /> : <Spinner />}
      </Shell>
    </DashCtx.Provider>
  );
}
