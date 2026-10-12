import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MarketingLayout from './components/MarketingLayout';
import DashboardLayout from './components/DashboardLayout';
import AdminLayout from './components/AdminLayout';
import { Spinner } from './components/ui';
import Home from './pages/marketing/Home';
import { HowItWorks, Pricing, About, FAQ, Contact, Terms, Privacy } from './pages/marketing/pages';
import { Login, Register, VerifyEmail, Forgot, Reset } from './pages/auth/Auth';
import Overview from './pages/dashboard/Overview';
import Orders from './pages/dashboard/Orders';
import Menu from './pages/dashboard/Menu';
import Settings from './pages/dashboard/Settings';
import Fulfillment from './pages/dashboard/Fulfillment';
import Messages from './pages/dashboard/Messages';
import Reports from './pages/dashboard/Reports';
import { Payments, QR, Analytics, Subscription } from './pages/dashboard/ProPages';
import Restaurant from './pages/public/Restaurant';
import Track from './pages/public/Track';
import AdminOverview from './pages/admin/Overview';
import AdminUsers from './pages/admin/Users';
import AdminUserDetail from './pages/admin/UserDetail';
import AdminRestaurants from './pages/admin/Restaurants';
import AdminRestaurantDetail from './pages/admin/RestaurantDetail';
import AdminSubscriptions from './pages/admin/Subscriptions';
import AdminTransactions from './pages/admin/Transactions';
import AdminComplaints from './pages/admin/Complaints';
import AdminComplaintDetail from './pages/admin/ComplaintDetail';
import AdminAnalytics from './pages/admin/Analytics';
import AdminEmails from './pages/admin/Emails';
import AdminLogs from './pages/admin/Logs';
import AdminSettings from './pages/admin/PlatformSettings';
import { api } from './lib/api';

const PLATFORM = (import.meta.env.VITE_PLATFORM_DOMAIN || 'localhost:5173').toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
const host = window.location.host.toLowerCase();
const bare = (h) => h.replace(/^www\./, '');
// Hosts that are definitely the Ordarly app itself: the configured platform host, localhost, raw IPs and hosting previews.
const isPlatformHost = bare(host) === bare(PLATFORM) || /^(localhost|127\.|\[::1\]|0\.0\.0\.0|\d{1,3}(\.\d{1,3}){3})/.test(host) || host.endsWith('.vercel.app') || host.endsWith('.netlify.app') || host.endsWith('.onrender.com');

// Anything else MAY be a restaurant's custom domain. We only treat it as one after the API confirms it, so a
// mis-set VITE_PLATFORM_DOMAIN can never turn the whole app (and every restaurant link) into "Restaurant not found".
function CustomDomainGate() {
  const [state, setState] = useState('checking');
  useEffect(() => { api.get(`/public/by-domain/${encodeURIComponent(host)}`).then(() => setState('custom')).catch(() => setState('platform')); }, []);
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
  return isPlatformHost ? <PlatformRoutes /> : <CustomDomainGate />;
}
