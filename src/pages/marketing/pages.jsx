import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '../../components/ui';

const Hero = ({ eyebrow, title, sub }) => (
  <section className="mx-auto max-w-3xl px-5 pb-8 pt-14 text-center">
    <span className="eyebrow">{eyebrow}</span>
    <h1 className="mt-2 font-display text-4xl font-bold md:text-5xl">{title}</h1>
    {sub && <p className="mx-auto mt-4 max-w-xl text-ink-500">{sub}</p>}
  </section>
);

export function HowItWorks() {
  const steps = [
    ['1', 'Create your account', 'Register your restaurant, verify your email and pick your page link.'],
    ['2', 'Build your menu', 'Add categories and meals with photos and prices. Free includes 10 active meals.'],
    ['3', 'Share your link', 'Post it on WhatsApp status, Instagram, or print a QR code (Pro).'],
    ['4', 'Receive orders', 'Free: customers send their cart to your WhatsApp. Pro: full checkout with delivery, pickup or dine-in.'],
    ['5', 'Get paid your way', 'Pro: Paystack online payments, bank transfer with proof review, or pay on delivery.'],
    ['6', 'Keep customers updated', 'Pro customers get a secure tracking link and email updates, with no account needed.'],
  ];
  return (
    <main>
      <Hero eyebrow="How it works" title="From sign-up to first order in an afternoon" />
      <div className="mx-auto grid max-w-5xl gap-5 px-5 md:grid-cols-3">
        {steps.map(([n, t, d]) => (
          <div key={n} className="card p-6"><div className="mb-3 grid h-9 w-9 place-items-center rounded-full bg-brand-500 font-bold text-white">{n}</div><h3 className="font-bold">{t}</h3><p className="mt-1 text-sm text-ink-500">{d}</p></div>
        ))}
      </div>
      <div className="mx-auto mt-10 max-w-3xl px-5 text-center"><Link to="/register" className="btn-primary px-8 py-3">Get started free</Link></div>
    </main>
  );
}

const Row = ({ children, on = true }) => <li className={`flex gap-2 text-sm ${on ? '' : 'text-ink-300 line-through'}`}><span className={on ? 'text-brand-500' : ''}>{on ? '✓' : '✕'}</span>{children}</li>;

export function Pricing() {
  return (
    <main>
      <Hero eyebrow="Pricing" title="Simple, honest pricing" sub="Start free. Upgrade only when your restaurant is ready for online checkout." />
      <div className="mx-auto grid max-w-4xl gap-6 px-5 md:grid-cols-2">
        <div className="card p-7">
          <h3 className="text-lg font-bold">Free</h3><div className="mt-2 font-display text-4xl font-bold">₦0</div><p className="text-sm text-ink-500">For getting started</p>
          <ul className="mt-5 space-y-2.5"><Row>Public ordering page</Row><Row>Up to 10 active meals</Row><Row>WhatsApp ordering</Row><Row>Order history dashboard</Row><Row on={false}>Online checkout &amp; payments</Row><Row on={false}>Delivery &amp; tracking</Row><Row on={false}>QR code &amp; custom domain</Row></ul>
          <Link to="/register" className="btn-ghost mt-6 w-full">Start free</Link>
        </div>
        <div className="rounded-3xl bg-night p-7 text-white shadow-card">
          <div className="flex items-center justify-between"><h3 className="text-lg font-bold">Pro</h3><span className="rounded-full bg-tomato-500 px-3 py-1 text-[11px] font-bold">14-day free trial</span></div>
          <div className="mt-2 font-display text-4xl font-bold">₦5,000<span className="text-base font-sans font-normal text-white/60"> / month</span></div><p className="text-sm text-white/60">For restaurants taking online orders</p>
          <ul className="mt-5 space-y-2.5 text-white">
            <Row>Everything in Free</Row><Row>Unlimited meals</Row><Row>Checkout with Paystack, bank transfer &amp; pay on delivery</Row><Row>Delivery with fees per state, pickup &amp; dine-in</Row><Row>Secure order tracking &amp; email notifications</Row><Row>Printable QR code</Row><Row>Custom domain</Row><Row>Sales &amp; order analytics</Row>
          </ul>
          <Link to="/register" className="btn-accent mt-6 w-full">Start 14-day trial</Link>
        </div>
      </div>
      <p className="mx-auto mt-6 max-w-2xl px-5 text-center text-xs text-ink-500">Prices may be adjusted by Orderly with notice. Payment-processing fees on food orders are charged by the payment provider and borne by the restaurant. Orderly takes no commission on food orders.</p>
    </main>
  );
}

export function About() {
  return (
    <main>
      <Hero eyebrow="About us" title="Built for Nigerian restaurants" sub="Most of our restaurants already take orders on WhatsApp. Orderly keeps what works and removes the mess." />
      <div className="mx-auto max-w-3xl space-y-5 px-5 text-ink-700">
        <p>Orders get lost in chats, prices change mid-conversation, and nobody knows who has actually paid. We built Orderly so every restaurant, from a single kitchen to a growing chain, can have a clean ordering page, a clear dashboard and payments that are verified, not assumed.</p>
        <div className="grid gap-4 md:grid-cols-3">
          {[['Customers first', 'No accounts, no app downloads. One link, a few taps.'], ['Your money is yours', 'We never hold your sales. Food payments are separate from your subscription.'], ['Honest by design', 'We never claim an order is confirmed or paid before it is.']].map(([t, d]) => <div key={t} className="card p-5"><b>{t}</b><p className="mt-1 text-sm text-ink-500">{d}</p></div>)}
        </div>
      </div>
    </main>
  );
}

const FAQS = [
  ['What is the difference between Free and Pro?', 'Free gives you a menu page (10 active meals) and WhatsApp orders. Pro adds checkout, Paystack and bank-transfer payments, pay on delivery, delivery by state, pickup, dine-in, order tracking, QR codes, a custom domain and analytics.'],
  ['Do customers need to create an account?', 'No. Customers order without registering.'],
  ['How do WhatsApp orders work on Free?', 'The customer builds a cart, we save an order request in your dashboard, then open WhatsApp with the order pre-filled. The order is only confirmed once you accept it. Opening WhatsApp does not prove the customer sent the message.'],
  ['Who receives the money from customers?', 'You do. Paystack payments are routed to your own approved merchant or subaccount arrangement. Bank transfers go straight to your account. Orderly never collects and redistributes your sales, and charges no commission.'],
  ['How long does Paystack settlement take?', 'Settlement timing is set by Paystack and your account, so we cannot promise instant settlement. Your dashboard shows payment status, not guaranteed payout times.'],
  ['How does bank transfer verification work?', 'Customers upload a screenshot, but a screenshot never marks an order paid. You check your own bank records and then accept or reject the proof.'],
  ['What happens if my Pro plan expires?', 'You move to Free automatically. Nothing is deleted. If you have more than 10 active meals, they stay, but you cannot activate more until you are within the limit or renew.'],
  ['Can I use my own domain?', 'Yes, on Pro. Add the domain in Settings, create the DNS records shown, and verify. If Pro lapses, your page remains available on your Orderly link.'],
  ['Is there a free trial?', 'Yes. Each restaurant can activate one 14-day Pro trial from the dashboard.'],
];

export function FAQ() {
  const [open, setOpen] = useState(0);
  return (
    <main>
      <Hero eyebrow="FAQ" title="Questions, answered" />
      <div className="mx-auto max-w-3xl space-y-3 px-5">
        {FAQS.map(([q, a], i) => (
          <button key={q} onClick={() => setOpen(open === i ? -1 : i)} className="card block w-full p-5 text-left">
            <span className="flex items-center justify-between gap-4 font-semibold">{q}<span className="text-brand-500">{open === i ? '−' : '+'}</span></span>
            {open === i && <span className="mt-2 block text-sm text-ink-500">{a}</span>}
          </button>
        ))}
      </div>
    </main>
  );
}

export function Contact() {
  const email = import.meta.env.VITE_SUPPORT_EMAIL || 'support@yourdomain.com';
  const [f, setF] = useState({ name: '', email: '', message: '' });
  const submit = (e) => {
    e.preventDefault();
    window.location.href = `mailto:${email}?subject=${encodeURIComponent('Orderly enquiry from ' + f.name)}&body=${encodeURIComponent(f.message + '\n\n' + f.name + ' (' + f.email + ')')}`;
  };
  return (
    <main>
      <Hero eyebrow="Contact" title="Talk to us" sub="Questions about setup, billing or payments? We usually reply within one business day." />
      <div className="mx-auto grid max-w-4xl gap-6 px-5 md:grid-cols-5">
        <div className="space-y-4 md:col-span-2">
          <div className="card p-5"><div className="text-xs text-ink-500">Email</div><b>{email}</b></div>
          <div className="card p-5"><div className="text-xs text-ink-500">Hours</div><b>Mon–Fri, 9am–5pm WAT</b></div>
        </div>
        <form onSubmit={submit} className="card space-y-4 p-6 md:col-span-3">
          <div><label className="label">Your name</label><input className="input" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div><label className="label">Email</label><input type="email" className="input" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <div><label className="label">Message</label><textarea rows={5} className="input" required value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} /></div>
          <button className="btn-primary w-full">Send via email</button>
        </form>
      </div>
    </main>
  );
}

const Doc = ({ title, updated, children }) => (
  <main className="mx-auto max-w-3xl px-5 pb-6 pt-14">
    <h1 className="font-display text-4xl font-bold">{title}</h1>
    <p className="mt-1 text-sm text-ink-500">Last updated: {updated}</p>
    <div className="mt-4"><Alert kind="info">Draft template. Have a qualified Nigerian lawyer review and adapt this document before launch.</Alert></div>
    <div className="mt-6 space-y-6 text-sm leading-7 text-ink-700 [&_h2]:mb-1 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-ink-900">{children}</div>
  </main>
);

export function Terms() {
  return (
    <Doc title="Terms & Conditions" updated="October 2026">
      <section><h2>1. About the service</h2><p>Orderly provides software that lets restaurants publish an online ordering page, manage menus and orders, and, on the Pro plan, accept checkout payments. Orderly is a technology provider and is not a party to the sale of food between a restaurant and its customers.</p></section>
      <section><h2>2. Accounts</h2><p>You must provide accurate information, keep your credentials secure, and are responsible for activity on your account. We may suspend accounts that breach these terms or applicable law.</p></section>
      <section><h2>3. Plans and billing</h2><p>The Free plan is provided at no charge with the limits shown on our pricing page. Pro is billed monthly at the price shown at purchase. Pro features are enabled only after payment is verified or during an eligible 14-day trial. When Pro expires your account reverts to Free; your data is retained.</p></section>
      <section><h2>4. Food-order payments</h2><p>Each restaurant is an independent merchant. Online payments are processed by Paystack under the restaurant's own approved arrangement, subject to Paystack's terms, fees and settlement schedule. Orderly does not collect or redistribute food-order proceeds and charges no commission on them. Bank transfers and pay-on-delivery are arranged directly between restaurant and customer; the restaurant is solely responsible for confirming receipt of funds.</p></section>
      <section><h2>5. Restaurant responsibilities</h2><p>Restaurants are responsible for menu accuracy, pricing, food safety, fulfilment, delivery, refunds, and compliance with all applicable laws and licences.</p></section>
      <section><h2>6. Acceptable use</h2><p>You may not use Orderly for unlawful, fraudulent or misleading activity, to upload harmful content, to interfere with the service, or to access other users' data.</p></section>
      <section><h2>7. Availability and liability</h2><p>We aim for reliable service but do not guarantee uninterrupted availability. To the extent permitted by law, Orderly is not liable for indirect or consequential loss, or for losses arising from third-party services such as WhatsApp, Paystack, or email providers.</p></section>
      <section><h2>8. Termination</h2><p>You may close your account at any time. We may suspend or terminate accounts for breach or legal reasons.</p></section>
      <section><h2>9. Governing law</h2><p>These terms are governed by the laws of the Federal Republic of Nigeria.</p></section>
      <section><h2>10. Contact</h2><p>Questions about these terms: see our <Link className="text-brand-600 underline" to="/contact">contact page</Link>.</p></section>
    </Doc>
  );
}

export function Privacy() {
  return (
    <Doc title="Privacy Policy" updated="October 2026">
      <section><h2>1. Who we are</h2><p>Orderly is the data controller for restaurant account data. For customer order data, the restaurant is the controller and Orderly acts as its processor. We handle personal data in line with the Nigeria Data Protection Act 2023.</p></section>
      <section><h2>2. Data we collect</h2><p><b>Restaurants:</b> name, email, phone, address, restaurant details, subscription and payment records, and (where supplied) bank details for transfer instructions or payment onboarding. <b>Customers:</b> name, phone, email, delivery address, order contents and payment proof images, as needed to fulfil an order.</p></section>
      <section><h2>3. How we use it</h2><p>To provide the service, process orders, send transactional emails, verify payments, prevent fraud, provide support, and meet legal obligations. We do not sell personal data.</p></section>
      <section><h2>4. Sharing</h2><p>We share data only with providers needed to run the service: payment processing (Paystack), email delivery, image storage and hosting. Customer data is shared with the restaurant they order from.</p></section>
      <section><h2>5. Security</h2><p>Passwords are hashed, sessions use HTTP-only cookies, payment-proof images are access-controlled, and bank details are masked in the dashboard. We never store card numbers, CVVs, PINs or OTPs.</p></section>
      <section><h2>6. Retention</h2><p>We keep order and payment records for as long as needed for the restaurant's business records and legal obligations, then delete or anonymise them.</p></section>
      <section><h2>7. Your rights</h2><p>You may request access, correction, deletion or restriction of your personal data, and may object to certain processing, by contacting us. You may also complain to the Nigeria Data Protection Commission.</p></section>
      <section><h2>8. Cookies</h2><p>We use essential cookies to keep restaurant owners signed in. We do not use advertising cookies.</p></section>
      <section><h2>9. Changes</h2><p>We will update this page when our practices change.</p></section>
    </Doc>
  );
}
