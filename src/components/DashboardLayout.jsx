import { useEffect, useState, createContext, useContext } from 'react';
import { NavLink, Outlet, useNavigate, Navigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Logo, Spinner } from './ui';

const DashCtx = createContext(null);
export const useDash = () => useContext(DashCtx);

const nav = [
  ['/dashboard', 'Overview', 'M3 12l9-9 9 9M5 10v10h14V10', true],
  ['/dashboard/orders', 'Orders', 'M6 2h12l2 5H4zM4 7v13h16V7'],
  ['/dashboard/menu', 'Menu', 'M4 6h16M4 12h16M4 18h10'],
  ['/dashboard/fulfillment', 'Delivery & Pickup', 'M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 100-4 2 2 0 000 4zM17 19a2 2 0 100-4 2 2 0 000 4z'],
  ['/dashboard/payments', 'Payments', 'M3 6h18v12H3zM3 10h18'],
  ['/dashboard/qr', 'QR Code', 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2z'],
  ['/dashboard/analytics', 'Analytics', 'M4 20V10M10 20V4M16 20v-8M22 20H2'],
  ['/dashboard/subscription', 'Subscription', 'M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z'],
  ['/dashboard/settings', 'Settings', 'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 00-2-1.2L14 3h-4l-.5 2.6a7 7 0 00-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 005 12'],
];

export default function DashboardLayout() {
  const { user, loading, logout } = useAuth(); const go = useNavigate();
  const [data, setData] = useState(null); const [open, setOpen] = useState(false);
  const load = () => api.get('/restaurant').then(setData).catch(() => {});
  useEffect(() => { if (user) load(); }, [user]);
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;

  const sub = data?.subscription;
  const banner = data && (data.isPro && sub?.status === 'trialing'
    ? `Pro trial: ${Math.max(0, Math.ceil((new Date(sub.trialEnd) - Date.now()) / 86400000))} day(s) left`
    : !data.isPro && sub?.status === 'expired' ? 'Your Pro plan has expired. Upgrade to restore Pro features.' : null);

  return (
    <DashCtx.Provider value={{ data, reload: load }}>
      <div className="min-h-screen bg-[#f6f8f4] md:flex">
        <aside className={`${open ? 'block' : 'hidden'} fixed inset-y-0 left-0 z-40 w-64 overflow-y-auto border-r border-black/5 bg-white p-4 md:static md:block`}>
          <div className="mb-6 px-2"><Logo /></div>
          <nav className="space-y-1">
            {nav.map(([to, label, d, end]) => (
              <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
                className={({ isActive }) => `flex items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-sm font-semibold transition ${isActive ? 'border-tomato-500/40 bg-tomato-50 text-tomato-600' : 'border-transparent text-ink-700 hover:bg-mint-100'}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>{label}
              </NavLink>
            ))}
          </nav>
          {data && (
            <a href={data.publicUrl} target="_blank" rel="noreferrer" className="mt-6 block rounded-3xl bg-night p-4 text-xs text-white">
              <div className="text-white/60">Your public page</div><div className="mt-1 break-all font-semibold">{data.publicUrl.replace('https://', '')}</div><div className="mt-2 text-brand-100">Open ↗</div>
            </a>
          )}
        </aside>
        <div className="min-w-0 flex-1">
          <header className="flex items-center justify-between border-b border-black/5 bg-white px-4 py-3 md:px-8">
            <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Menu"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h16" /></svg></button>
            <div className="hidden md:block"><div className="font-display text-xl font-bold">Hello, {user.name.split(' ')[0]} 👋</div><div className="text-xs text-ink-500">{data?.restaurant.name}</div></div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${data?.isPro ? 'bg-tomato-50 text-tomato-600' : 'bg-slate-100 text-slate-600'}`}>{data?.isPro ? 'PRO' : 'FREE'}</span>
              <button onClick={async () => { await logout(); go('/'); }} className="btn-ghost !py-1.5">Sign out</button>
            </div>
          </header>
          {banner && <div className="bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-800 md:px-8">{banner}</div>}
          <main className="p-4 md:p-8">{data ? <Outlet /> : <Spinner />}</main>
        </div>
      </div>
    </DashCtx.Provider>
  );
}
