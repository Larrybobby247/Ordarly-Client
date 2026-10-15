import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
// PERF (changed): pages are now loaded on demand (code splitting) instead of all being bundled into one big file.
// Before: a customer opening a restaurant page also downloaded the whole admin and dashboard code.
// Now: each route group is its own small file that downloads only when that page is opened.
import MarketingLayout from './components/MarketingLayout';
import { Spinner, PageSkeleton } from './components/ui';
import { api } from './lib/api';

const DashboardLayout = lazy(() => import('./components/DashboardLayout'));
const AdminLayout = lazy(() => import('./components/AdminLayout'));
// Helper for files that export several pages by name (e.g. pages.jsx): picks one of them as the lazy component.
const named = (load, key) => lazy(() => load().then((m) => ({ default: m[key] })));

const Home = lazy(() => import('./pages/marketing/Home'));
const marketing = () => import('./pages/marketing/pages');
const HowItWorks = named(marketing, 'HowItWorks'), Pricing = named(marketing, 'Pricing'), About = named(marketing, 'About'),
  FAQ = named(marketing, 'FAQ'), Contact = named(marketing, 'Contact'), Terms = named(marketing, 'Terms'), Privacy = named(marketing, 'Privacy');
const auth = () => import('./pages/auth/Auth');
const Login = named(auth, 'Login'), Register = named(auth, 'Register'), VerifyEmail = named(auth, 'VerifyEmail'), Forgot = named(auth, 'Forgot'), Reset = named(auth, 'Reset');

const Overview = lazy(() => import('./pages/dashboard/Overview'));
const Orders = lazy(() => import('./pages/dashboard/Orders'));
const Menu = lazy(() => import('./pages/dashboard/Menu'));
const Settings = lazy(() => import('./pages/dashboard/Settings'));
const Fulfillment = lazy(() => import('./pages/dashboard/Fulfillment'));
const Messages = lazy(() => import('./pages/dashboard/Messages'));
const Reports = lazy(() => import('./pages/dashboard/Reports'));
const pro = () => import('./pages/dashboard/ProPages');
const Payments = named(pro, 'Payments');
const QR = named(pro, 'QR');
const Analytics = named(pro, 'Analytics');
const Subscription = named(pro, 'Subscription');

const Restaurant = lazy(() => import('./pages/public/Restaurant'));
const Track = lazy(() => import('./pages/public/Track'));

const AdminOverview = lazy(() => import('./pages/admin/Overview'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminUserDetail = lazy(() => import('./pages/admin/UserDetail'));
const AdminRestaurants = lazy(() => import('./pages/admin/Restaurants'));
const AdminRestaurantDetail = lazy(() => import('./pages/admin/RestaurantDetail'));
const AdminSubscriptions = lazy(() => import('./pages/admin/Subscriptions'));
const AdminTransactions = lazy(() => import('./pages/admin/Transactions'));
const AdminComplaints = lazy(() => import('./pages/admin/Complaints'));
const AdminComplaintDetail = lazy(() => import('./pages/admin/ComplaintDetail'));
const AdminAnalytics = lazy(() => import('./pages/admin/Analytics'));
const AdminEmails = lazy(() => import('./pages/admin/Emails'));
const AdminLogs = lazy(() => import('./pages/admin/Logs'));
const AdminSettings = lazy(() => import('./pages/admin/PlatformSettings'));


const PLATFORM = (import.meta.env.VITE_PLATFORM_DOMAIN || 'localhost:5173').toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
const host = window.location.host.toLowerCase();
const bare = (h) => h.replace(/^www\./, '');
// Hosts that are definitely the Ordarly app itself: the configured platform host, localhost, raw IPs and hosting previews.
const isPlatformHost = bare(host) === bare(PLATFORM) || /^(localhost|127\.|\[::1\]|0\.0\.0\.0|\d{1,3}(\.\d{1,3}){3})/.test(host) || host.endsWith('.vercel.app') || host.endsWith('.netlify.app') || host.endsWith('.onrender.com');

// Anything else MAY be a restaurant's custom domain. We only treat it as one after the API confirms it, so a
// mis-set VITE_PLATFORM_DOMAIN can never turn the whole app (and every restaurant link) into "Restaurant not found".
function CustomDomainGate() {
  const [state, setState] = useState('checking');
  useEffect(() => { // PERF (changed): cached for 30s because the Restaurant page asks for the exact same data right after this check (was a duplicate request).
    api.get(`/public/by-domain/${encodeURIComponent(host)}`, { ttl: 30000 }).then(() => setState('custom')).catch(() => setState('platform')); }, []);
  if (state === 'checking') return <Spinner />;
  if (state === 'custom') return <Routes><Route path="/track/:token" element={<Track />} /><Route path="*" element={<Restaurant domain={host} />} /></Routes>;
  return <PlatformRoutes />;
}

function PlatformRoutes() {
  return (
    <Routes>
      <Route element={<MarketingLayout />}>
        <Route index element={<Home />} />
        <Route path="how-it-works" element={<HowItWorks />} /><Route path="pricing" element={<Pricing />} />
        <Route path="about" element={<About />} /><Route path="faq" element={<FAQ />} /><Route path="contact" element={<Contact />} />
        <Route path="terms" element={<Terms />} /><Route path="privacy" element={<Privacy />} />
      </Route>
      <Route path="login" element={<Login />} /><Route path="register" element={<Register />} />
      <Route path="verify-email" element={<VerifyEmail />} /><Route path="forgot-password" element={<Forgot />} /><Route path="reset-password" element={<Reset />} />
      <Route path="dashboard" element={<DashboardLayout />}>
        <Route index element={<Overview />} /><Route path="orders" element={<Orders />} /><Route path="menu" element={<Menu />} />
        <Route path="messages" element={<Messages />} /><Route path="reports" element={<Reports />} />
        <Route path="fulfillment" element={<Fulfillment />} /><Route path="payments" element={<Payments />} /><Route path="qr" element={<QR />} />
        <Route path="analytics" element={<Analytics />} /><Route path="subscription" element={<Subscription />} /><Route path="settings" element={<Settings />} />
      </Route>
      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<AdminOverview />} />
        <Route path="users" element={<AdminUsers />} /><Route path="users/:id" element={<AdminUserDetail />} />
        <Route path="restaurants" element={<AdminRestaurants />} /><Route path="restaurants/:id" element={<AdminRestaurantDetail />} />
        <Route path="subscriptions" element={<AdminSubscriptions />} /><Route path="transactions" element={<AdminTransactions />} />
        <Route path="complaints" element={<AdminComplaints />} /><Route path="complaints/:id" element={<AdminComplaintDetail />} />
        <Route path="analytics" element={<AdminAnalytics />} /><Route path="emails" element={<AdminEmails />} />
        <Route path="logs" element={<AdminLogs />} /><Route path="settings" element={<AdminSettings />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
      <Route path="track/:token" element={<Track />} />
      <Route path=":slug" element={<Restaurant />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  // PERF (new): Suspense shows a light placeholder while a page's file downloads. Layouts add their own inner Suspense so menus stay on screen.
  return <Suspense fallback={<div className="p-6"><PageSkeleton /></div>}>{isPlatformHost ? <PlatformRoutes /> : <CustomDomainGate />}</Suspense>;
}
