import { Link } from 'react-router-dom';
import { naira } from '../lib/api';
import { usePlatform } from '../lib/platform';

const Row = ({ children, on = true, strong }) => <li className={`flex gap-2 text-sm ${on ? '' : 'opacity-50 line-through'}`}><span className={on ? 'text-brand-500' : ''}>{on ? '✓' : '✕'}</span><span className={strong ? 'font-semibold' : ''}>{children}</span></li>;

// Shared by the homepage and the pricing page, and driven by the live plan settings, so the numbers can never disagree with the product.
export default function PricingPlans() {
  const { pricing } = usePlatform();
  const biz = pricing.business || { open: false };
  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-5 md:grid-cols-3">
      <div className="card flex flex-col p-7">
        <h3 className="text-lg font-bold">Free</h3>
        <div className="mt-2 font-display text-4xl font-bold">₦0<span className="text-base font-sans font-normal text-ink-500"> / month</span></div>
        <p className="text-sm text-ink-500">Everything you need to start taking orders</p>
        <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-xs text-amber-800"><b>{pricing.freeCommissionPct}% commission on the meal subtotal only.</b> No commission on delivery fees.</div>
        <ul className="mt-5 flex-1 space-y-2.5">
          <Row>Your own online ordering website</Row><Row>Menu, categories, add-ons &amp; meal sizes</Row><Row>Order dashboard &amp; sales analytics</Row><Row>Online payment with Paystack</Row><Row>Delivery fees, pickup &amp; dine-in</Row><Row>Order tracking &amp; WhatsApp notifications</Row><Row>Scheduled (order-for-later) orders</Row><Row>Earnings after commission, clearly shown</Row>
          <Row on={false}>Custom domain</Row><Row on={false}>Pay on delivery</Row><Row on={false}>Bank-account payment option</Row>
        </ul>
        <Link to="/register" className="btn-ghost mt-6 w-full">Get Started Free</Link>
      </div>

      <div className="relative flex flex-col rounded-3xl bg-night p-7 text-white shadow-card">
        <span className="absolute -top-3 right-6 rounded-full bg-tomato-500 px-3 py-1 text-[11px] font-bold">Most popular</span>
        <h3 className="text-lg font-bold">Pro</h3>
        <div className="mt-2 font-display text-4xl font-bold">{naira(pricing.proPriceNgn)}<span className="text-base font-sans font-normal text-white/60"> / month</span></div>
        <p className="text-sm text-white/60">For restaurants that want to keep every naira of their sales</p>
        {pricing.yearlyPriceNgn > 0 && <p className="mt-1 text-sm font-semibold text-brand-100">or {naira(pricing.yearlyPriceNgn)} / year · save {pricing.yearlyDiscountPct}%</p>}
        <div className="mt-3 rounded-2xl bg-white/10 p-3 text-xs"><b>{pricing.proCommissionPct}% Ordarly commission.</b> Your sales are yours.</div>
        <ul className="mt-5 flex-1 space-y-2.5 text-white">
          <Row strong>Everything in Free</Row><Row>Custom domain</Row><Row>Bank-account payment option</Row><Row>Pay on delivery</Row><Row>Unlimited meals</Row><Row>QR codes &amp; email notifications</Row><Row>All other Pro features</Row>
        </ul>
        <Link to="/register" className="btn-accent mt-6 w-full">Upgrade to Pro</Link>
      </div>

      <div className="card flex flex-col border-violet-200 p-7">
        <h3 className="text-lg font-bold">Business / Multi-Branch</h3>
        {biz.open ? <div className="mt-2 font-display text-4xl font-bold">{naira(biz.priceNgn)}<span className="text-base font-sans font-normal text-ink-500"> / month</span></div> : <div className="mt-2 font-display text-4xl font-bold">Custom</div>}
        <p className="text-sm text-ink-500">For restaurants with more than one location{biz.open ? `, up to ${biz.maxBranches} branches` : ''}</p>
        {biz.open && biz.yearlyPriceNgn > 0 && <p className="mt-1 text-sm font-semibold text-violet-700">or {naira(biz.yearlyPriceNgn)} / year</p>}
        <ul className="mt-5 flex-1 space-y-2.5">
          <Row strong>Everything in Pro</Row><Row>Multi-branch management</Row><Row>One centralised dashboard</Row><Row>Branch menus, prices, hours &amp; delivery</Row><Row>Staff invitations &amp; permissions</Row><Row>Branch-specific analytics</Row><Row>Combined business reporting</Row>
        </ul>
        <Link to="/contact" className="btn-primary mt-6 w-full">Explore Business Plan</Link>
      </div>
    </div>
  );
}
