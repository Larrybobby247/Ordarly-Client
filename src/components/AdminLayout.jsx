import { useEffect, useState } from 'react';
import { useVisibleInterval } from '../lib/hooks';
import { Navigate, useNavigate } from 'react-router-dom';
import Shell from './Shell';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Logo, Spinner, Badge } from './ui';

const nav = [
  ['/admin', 'Overview', 'M3 12l9-9 9 9M5 10v10h14V10', true],
  ['/admin/users', 'Users', 'M16 11a4 4 0 10-8 0 4 4 0 008 0zM4 21a8 8 0 0116 0'],
  ['/admin/restaurants', 'Restaurants', 'M4 21V8l8-5 8 5v13M9 21v-6h6v6'],
  ['/admin/subscriptions', 'Subscriptions', 'M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z'],
  ['/admin/transactions', 'Transactions', 'M3 6h18v12H3zM3 10h18'],
  ['/admin/complaints', 'Complaints', 'M4 5h16v11H9l-5 4zM8 9h8M8 12h5', false, 'complaints'],
  ['/admin/analytics', 'Analytics', 'M4 20V10M10 20V4M16 20v-8M22 20H2'],
  ['/admin/emails', 'Emails', 'M3 6h18v12H3zM3 7l9 7 9-7'],
  ['/admin/logs', 'Logs & audit', 'M6 3h9l4 4v14H6zM9 12h7M9 16h7'],
  ['/admin/settings', 'Platform settings', 'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 00-2-1.2L14 3h-4l-.5 2.6a7 7 0 00-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 005 12'],
];

export default function AdminLayout() {
  const { user, loading, logout } = useAuth(); const go = useNavigate();
  const [badge, setBadge] = useState(0);
  useEffect(() => {
    if (user?.role !== 'admin') return undefined;
    api.get('/admin/stats').then((s) => setBadge(s.openComplaints || 0)).catch(() => {});
  }, [user]);
  // PERF (changed): the badge refresh now pauses while the tab is hidden (it used to keep polling in the background).
  useVisibleInterval(() => { if (user?.role === 'admin') api.get('/admin/stats').then((s) => setBadge(s.openComplaints || 0)).catch(() => {}); }, 60000);
  if (loading) return <Spinner />;
  if (!user || user.role !== 'admin') return <Navigate to="/login" replace />;

  return (
    <Shell nav={nav} badges={{ complaints: badge }}
      brand={<><Logo /><Badge color="red">ADMIN</Badge></>}
      topLeft={<div className="hidden truncate text-sm text-ink-500 md:block">Signed in as <b className="text-ink-900">{user.email}</b></div>}
      topRight={<button onClick={async () => { await logout(); go('/'); }} className="btn-ghost !py-1.5">Sign out</button>} />
  );
}
