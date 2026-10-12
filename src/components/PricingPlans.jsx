import { Link } from 'react-router-dom';
import { naira } from '../lib/api';
import { usePlatform } from '../lib/platform';

const Row = ({ children, on = true }) => <li className={`flex gap-2 text-sm ${on ? '' : 'text-ink-300 line-through'}`}><span className={on ? 'text-brand-500' : ''}>{on ? '✓' : '✕'}</span>{children}</li>;

// Shared by the homepage and the pricing page so the price is always the same one.
export default function PricingPlans() {
  const { pricing } = usePlatform();
  return (
    <div className="mx-auto grid max-w-4xl gap-6 px-5 md:grid-cols-2">
      <div className="card p-7">
        <h3 className="text-lg font-bold">Free</h3><div className="mt-2 font-display text-4xl font-bold">₦0</div><p className="text-sm text-ink-500">For getting started</p>
        <ul className="mt-5 space-y-2.5"><Row>Public ordering page</Row><Row>Up to {pricing.freeMeals} active meals</Row><Row>Meal add-ons (extras with prices)</Row><Row>WhatsApp ordering</Row><Row>Customer messages inbox</Row><Row on={false}>Online checkout &amp; payments</Row><Row on={false}>Delivery with distance pricing &amp; tracking</Row><Row on={false}>QR code &amp; custom domain</Row></ul>
        <Link to="/register" className="btn-ghost mt-6 w-full">Start free</Link>
      </div>
      <div className="rounded-3xl bg-night p-7 text-white shadow-card">
        <div className="flex items-center justify-between"><h3 className="text-lg font-bold">Pro</h3>{pricing.trialDays > 0 && <span className="rounded-full bg-tomato-500 px-3 py-1 text-[11px] font-bold">{pricing.trialDays}-day free trial</span>}</div>
        <div className="mt-2 font-display text-4xl font-bold">{naira(pricing.proPriceNgn)}<span className="text-base font-sans font-normal text-white/60"> / month</span></div><p className="text-sm text-white/60">For restaurants taking online orders</p>
        <ul className="mt-5 space-y-2.5 text-white">
          <Row>Everything in Free</Row><Row>Unlimited meals</Row><Row>Checkout with Paystack, bank transfer &amp; pay on delivery</Row><Row>Delivery priced by distance, pickup &amp; dine-in</Row><Row>Secure order tracking &amp; email notifications</Row><Row>Printable QR code</Row><Row>Custom domain</Row><Row>Sales &amp; order analytics</Row>
        </ul>
        <Link to="/register" className="btn-accent mt-6 w-full">{pricing.trialDays > 0 ? `Start ${pricing.trialDays}-day trial` : 'Get Pro'}</Link>
      </div>
    </div>
  );
}
