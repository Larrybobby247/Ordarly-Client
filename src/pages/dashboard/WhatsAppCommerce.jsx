import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, naira } from '../../lib/api';
import { Alert, Badge } from '../../components/ui';
import WhatsAppControls from '../../components/WhatsAppControls';

export const WA_TABS = [['/dashboard/whatsapp', 'Overview'], ['/dashboard/whatsapp/inbox', 'Inbox'], ['/dashboard/whatsapp/automation', 'Automation settings'], ['/dashboard/whatsapp/billing', 'Usage & billing']];
export function WaTabs({ here }) {
  return <nav className="flex flex-wrap gap-1.5" aria-label="WhatsApp sections">{WA_TABS.map(([to, l]) => <Link key={to} to={to} className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold ${here === to ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-black/10 text-ink-500 hover:bg-black/5'}`}>{l}</Link>)}</nav>;
}

const Stat = ({ label, value, hint }) => <div className="card p-4"><div className="text-xs text-ink-500">{label}</div><div className="mt-1 text-2xl font-bold">{value}</div>{hint && <div className="mt-0.5 text-xs text-ink-500">{hint}</div>}</div>;

// WhatsApp Commerce overview: the three controls first, then Ordarly credits and what WhatsApp has done for the restaurant in the last 30 days.
export default function WhatsAppCommerce() {
  const [u, setU] = useState(null);
  useEffect(() => { api.get('/whatsapp/usage').then(setU).catch(() => {}); }, []);
  const c = u?.credits, p = u?.last30Days;
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h3 className="text-lg font-bold">💬 WhatsApp Commerce</h3>
        <p className="text-sm text-ink-500">Take orders and talk to customers on your own WhatsApp number. You are always in control: connect or disconnect, and switch automation and orders on or off, whenever you like.</p>
      </div>
      <WaTabs here="/dashboard/whatsapp" />
      <WhatsAppControls />
      {c && (c.level === 'zero'
        ? <Alert kind="error">Your Ordarly message credits are finished, so automated WhatsApp replies are paused. Customer messages are still received. <Link className="font-semibold underline" to="/dashboard/whatsapp/billing">Buy more credits</Link></Alert>
        : (c.level === 'p10' || c.level === 'p25') && <Alert kind="info">Your Ordarly message credits are running low ({c.totalAvailable} left). <Link className="font-semibold underline" to="/dashboard/whatsapp/billing">See usage &amp; billing</Link></Alert>)}
      {c && p && (
        <section className="space-y-3">
          <h4 className="font-bold">Last 30 days</h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Ordarly credits left" value={c.totalAvailable} hint={`${c.monthlyRemaining} monthly + ${c.purchasedBalance} bought`} />
            <Stat label="WhatsApp orders" value={p.orders} hint={`${p.paidOrders} paid`} />
            <Stat label="Food sales (paid)" value={naira(p.foodRevenue)} hint="Meal subtotal, excluding delivery" />
            <Stat label="Conversations" value={p.conversations} hint={`${p.handovers} handed to your team`} />
          </div>
          <p className="text-xs text-ink-500">Ordarly credits are Ordarly's own message allowance. They are separate from what Meta may charge your WhatsApp Business Account. See <Link className="font-semibold text-brand-700 underline" to="/dashboard/whatsapp/billing">Usage &amp; billing</Link> for both.</p>
          {p.messagesSent > 0 && <div className="flex flex-wrap gap-2 text-xs"><Badge>{p.messagesSent} messages sent</Badge>{Object.entries(p.byDeliveryStatus).map(([k, v]) => <Badge key={k} color={k === 'failed' ? 'red' : k === 'delivered' || k === 'read' ? 'green' : 'gray'}>{v} {k}</Badge>)}</div>}
        </section>)}
    </div>
  );
}
