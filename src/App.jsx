import { Routes, Route, Navigate } from 'react-router-dom';
import MarketingLayout from './components/MarketingLayout';
import DashboardLayout from './components/DashboardLayout';
import Home from './pages/marketing/Home';
import { HowItWorks, Pricing, About, FAQ, Contact, Terms, Privacy } from './pages/marketing/pages';
import { Login, Register, VerifyEmail, Forgot, Reset } from './pages/auth/Auth';
import Overview from './pages/dashboard/Overview';
import Orders from './pages/dashboard/Orders';
import Menu from './pages/dashboard/Menu';
import Settings from './pages/dashboard/Settings';
import { Fulfillment, Payments, QR, Analytics, Subscription } from './pages/dashboard/ProPages';
import Restaurant from './pages/public/Restaurant';
import Track from './pages/public/Track';
import Admin from './pages/admin/Admin';

const PLATFORM = (import.meta.env.VITE_PLATFORM_DOMAIN || 'localhost:5173').toLowerCase();
const host = window.location.host.toLowerCase();
// Any host that isn't the platform (or localhost / a hosting preview) is treated as a restaurant's custom domain.
const isCustomDomain = host !== PLATFORM && !host.startsWith('localhost') && !host.endsWith('.vercel.app') && host !== `www.${PLATFORM}`;

export default function App() {
  if (isCustomDomain) {
    return <Routes><Route path="/track/:token" element={<Track />} /><Route path="*" element={<Restaurant domain={host} />} /></Routes>;
  }
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
        <Route path="fulfillment" element={<Fulfillment />} /><Route path="payments" element={<Payments />} /><Route path="qr" element={<QR />} />
        <Route path="analytics" element={<Analytics />} /><Route path="subscription" element={<Subscription />} /><Route path="settings" element={<Settings />} />
      </Route>
      <Route path="admin" element={<Admin />} />
      <Route path="track/:token" element={<Track />} />
      <Route path=":slug" element={<Restaurant />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
