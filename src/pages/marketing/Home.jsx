import { useState } from 'react';
import { Link } from 'react-router-dom';
import PricingPlans from '../../components/PricingPlans';

function MiniOrder() {
  return (
    <div className="w-60 rounded-3xl bg-white p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between text-xs font-semibold"><span>New order</span><span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">Pending</span></div>
      {[['2 × Jollof rice & chicken', '₦7,000'], ['1 × Suya platter', '₦4,500'], ['Delivery · 4.2 km', '₦1,400']].map(([a, b]) => (
        <div key={a} className="flex justify-between border-t border-black/5 py-2 text-xs"><span className="text-ink-700">{a}</span><b>{b}</b></div>
      ))}
      <div className="mt-2 flex justify-between rounded-2xl bg-brand-50 px-3 py-2 text-xs font-bold text-brand-700"><span>Total</span><span>₦12,900</span></div>
    </div>
  );
}

function PhoneMenu() {
  const items = [['Jollof rice & chicken', '₦3,500'], ['Pounded yam & egusi', '₦4,000'], ['Peppered snail', '₦6,000']];
  return (
    <div className="mx-auto w-64 rounded-[2.2rem] border-8 border-night bg-mint-50 p-3 shadow-2xl">
      <div className="mb-3 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 p-3 text-white"><div className="text-[10px] opacity-80">Mama Put Kitchen</div><div className="font-display text-lg leading-tight">Order fresh.<br />Eat happy.</div></div>
      <div className="mb-2 flex gap-1.5">{['All', 'Rice', 'Soups'].map((c, i) => <span key={c} className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${i ? 'bg-white' : 'bg-brand-500 text-white'}`}>{c}</span>)}</div>
      {items.map(([n, p]) => (
        <div key={n} className="mb-2 flex items-center gap-2 rounded-2xl bg-white p-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-200 to-orange-300" />
          <div className="flex-1 text-[11px] font-semibold leading-tight">{n}<div className="font-normal text-ink-500">{p}</div></div>
          <span className="grid h-6 w-6 place-items-center rounded-full bg-tomato-500 text-white">+</span>
        </div>
      ))}
      <div className="mt-2 rounded-full bg-night py-2 text-center text-[11px] font-semibold text-white">Order on WhatsApp · ₦7,500</div>
    </div>
  );
}

const faqs = [
  ['Is the Free plan really free?', 'Yes. Up to 10 active meals and unlimited WhatsApp order requests, no card needed.'],
  ['Do my customers need an account?', 'Never. They open your link, pick meals and order.'],
  ['Where does the money go?', 'Food payments go to your own Paystack arrangement or bank account. Ordarly never holds or redistributes your sales.'],
];

export default function Home() {
  const [open, setOpen] = useState(0);
  return (
    <main>
      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-10 pt-12 md:grid-cols-2 md:pt-20">
        <div>
          <span className="eyebrow">Online ordering for Nigerian restaurants</span>
          <h1 className="mt-3 font-display text-4xl font-bold leading-[1.05] md:text-6xl">
            A simpler way to <span className="text-brand-500">take orders</span> online.
          </h1>
          <p className="mt-5 max-w-lg text-ink-500">Give your restaurant its own ordering page in minutes. Start free with WhatsApp orders, then add checkout, delivery, payments and tracking with Pro.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/register" className="btn-primary px-6 py-3">Create your page — free</Link>
            <Link to="/how-it-works" className="btn-ghost px-6 py-3">See how it works</Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">{['WhatsApp orders', 'Paystack payments', 'Distance-based delivery', 'Meal add-ons', 'Order tracking', 'QR codes'].map((t) => <span key={t} className="chip">{t}</span>)}</div>
        </div>
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-100 via-mint-100 to-amber-50 p-8">
          <PhoneMenu />
          <div className="absolute -left-2 top-10 hidden scale-90 md:block"><MiniOrder /></div>
        </div>
      </section>

      {/* Feature band (green) */}
      <section className="mx-auto max-w-6xl px-5 pt-16">
        <span className="eyebrow">Everything in one place</span>
        <h2 className="mt-2 max-w-xl font-display text-3xl font-bold md:text-4xl">Menu, orders and payments, <span className="text-brand-500">without the chaos.</span></h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <div className="rounded-4xl bg-brand-500 p-6 text-white md:col-span-2">
            <h3 className="text-lg font-bold">Your own page, your own link</h3>
            <p className="mt-1 max-w-md text-sm text-white/80">Share it on WhatsApp, Instagram or a printed QR code. Pro restaurants can even use their own domain.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[['ordarly.ng/mama-put', 'Public link'], ['order.mamaput.com', 'Custom domain (Pro)'], ['QR code', 'Print-ready (Pro)']].map(([a, b]) => (
                <div key={a} className="rounded-2xl bg-white p-4 text-ink-900"><div className="text-xs text-ink-500">{b}</div><div className="mt-1 break-all text-sm font-bold">{a}</div></div>
              ))}
            </div>
          </div>
          <div className="rounded-4xl bg-night p-6 text-white">
            <h3 className="text-lg font-bold">Honest payments</h3>
            <p className="mt-1 text-sm text-white/70">Paid means paid. Orders are only marked paid after server-side verification or when you confirm the money arrived.</p>
            <div className="mt-6 space-y-2 text-xs">
              {[['Paystack', 'Verified'], ['Bank transfer', 'You confirm'], ['Pay on delivery', 'You collect']].map(([a, b]) => <div key={a} className="flex justify-between rounded-xl bg-white/10 px-3 py-2"><span>{a}</span><b className="text-brand-100">{b}</b></div>)}
            </div>
          </div>
        </div>
      </section>

      {/* Split section */}
      <section className="mx-auto mt-20 grid max-w-6xl items-center gap-10 px-5 md:grid-cols-2">
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between"><b>Live orders</b><span className="chip">Today</span></div>
          {[['#A3F9', 'Olivia M.', 'Preparing', 'bg-sky-50 text-sky-700'], ['#B71C', 'Ethan K.', 'New', 'bg-red-50 text-red-600'], ['#C204', 'Sophia R.', 'Ready', 'bg-brand-50 text-brand-700'], ['#D88E', 'Tunde A.', 'Out for delivery', 'bg-amber-50 text-amber-700']].map(([id, n, s, c]) => (
            <div key={id} className="flex items-center justify-between border-t border-black/5 py-3 text-sm"><span><b>{id}</b> <span className="text-ink-500">· {n}</span></span><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${c}`}>{s}</span></div>
          ))}
        </div>
        <div>
          <span className="eyebrow">Built for busy kitchens</span>
          <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">Not harder. Just <span className="text-brand-500">smarter</span> ordering.</h2>
          <p className="mt-3 text-ink-500">See every order, update its status in a tap, and let Pro customers follow along with a secure tracking link, no accounts and no phone calls asking “is it ready?”.</p>
          <div className="mt-6 space-y-3">
            {faqs.map(([q, a], i) => (
              <button key={q} onClick={() => setOpen(open === i ? -1 : i)} className="block w-full rounded-3xl bg-night p-4 text-left text-white">
                <span className="flex items-center justify-between text-sm font-semibold">{q}<span>{open === i ? '−' : '+'}</span></span>
                {open === i && <span className="mt-2 block text-sm text-white/70">{a}</span>}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mt-24">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <span className="eyebrow">Pricing</span>
          <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">Start free. <span className="text-brand-500">Upgrade when you're ready.</span></h2>
          <p className="mx-auto mb-8 mt-3 max-w-xl text-ink-500">No commission on your food sales, ever. Just a flat monthly price for Pro.</p>
        </div>
        <PricingPlans />
        <p className="mt-4 text-center text-xs text-ink-500"><Link to="/pricing" className="underline">Full pricing details</Link></p>
      </section>

      {/* CTA */}
      <section className="mx-auto mt-24 max-w-4xl px-5 text-center">
        <span className="eyebrow">Ready to start?</span>
        <h2 className="mt-2 font-display text-3xl font-bold md:text-5xl">Your first orders could be <span className="text-tomato-500">minutes away.</span></h2>
        <Link to="/register" className="btn-primary mt-7 px-8 py-3.5">Create your free page</Link>
        <p className="mt-3 text-xs text-ink-500">No card required. Try Pro free for 14 days anytime.</p>
      </section>
    </main>
  );
}
