import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '../../components/ui';
import { api } from '../../lib/api';
import ReportForm from '../../components/ReportForm';
import PricingPlans from '../../components/PricingPlans';
import { PHONE, WHATSAPP_URL, usePlatform } from '../../lib/platform';

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
    ['2', 'Build your menu', 'Add categories, meals with photos and prices, and add-ons like extra meat or drinks. Free includes 10 active meals.'],
    ['3', 'Share your link', 'Post it on WhatsApp status, Instagram, or print a QR code (Pro).'],
    ['4', 'Receive orders', 'Free: customers send their cart to your WhatsApp. Pro: full checkout with distance-priced delivery, pickup or dine-in.'],
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

export function Pricing() {
  return (
    <main>
      <Hero eyebrow="Pricing" title="Simple, honest pricing" sub="Start free. Upgrade only when your restaurant is ready for online checkout." />
      <PricingPlans />
      <p className="mx-auto mt-6 max-w-2xl px-5 text-center text-xs text-ink-500">Prices may be adjusted by Ordarly with notice. Payment-processing fees on food orders are charged by the payment provider and borne by the restaurant. Ordarly takes no commission on food orders.</p>
    </main>
  );
}

export function About() {
  return (
    <main>
      <Hero eyebrow="About us" title="Built for Nigerian restaurants" sub="Most of our restaurants already take orders on WhatsApp. Ordarly keeps what works and removes the mess." />
      <div className="mx-auto max-w-3xl space-y-8 px-5 text-ink-700">
        <section>
          <h2 className="font-display text-2xl font-bold text-ink-900">Why we built it</h2>
          <p className="mt-2">Orders get lost in chats, prices change mid-conversation, delivery fees get negotiated one customer at a time, and nobody knows who has actually paid. We built Ordarly so every restaurant, from a single kitchen to a growing chain, can have a clean ordering page, a clear dashboard and payments that are verified, not assumed.</p>
        </section>
        <div className="grid gap-4 md:grid-cols-3">
          {[['Customers first', 'No accounts, no app downloads. One link, a few taps.'], ['Your money is yours', 'We never hold your sales. Food payments are separate from your subscription.'], ['Honest by design', 'We never claim an order is confirmed or paid before it is.']].map(([t, d]) => <div key={t} className="card p-5"><b>{t}</b><p className="mt-1 text-sm text-ink-500">{d}</p></div>)}
        </div>
        <section>
          <h2 className="font-display text-2xl font-bold text-ink-900">What you get</h2>
          <ul className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            {[['Your own ordering page', 'A shareable link (and a QR code and custom domain on Pro) where customers search your menu, open a meal and see every detail.'],
              ['Meals with add-ons', 'Offer extra turkey, beef or a drink with its own price, so bigger orders are easy to place.'],
              ['Fair delivery pricing', 'Set a base fee and a price per extra kilometre. Customers search their address and see the exact fee, rounded to clean amounts.'],
              ['Honest payments', 'Paystack online payments verified on the server, bank transfers you confirm yourself, or pay on delivery.'],
              ['Orders and messages in one place', 'Update order status in a tap, answer customer messages by email from your dashboard, and report problems straight to our team.'],
              ['Order tracking', 'Pro customers follow their order with a private link and email updates.']].map(([t, d]) => <li key={t} className="card p-4"><b>{t}</b><p className="mt-1 text-ink-500">{d}</p></li>)}
          </ul>
        </section>
        <section>
          <h2 className="font-display text-2xl font-bold text-ink-900">How we run things</h2>
          <p className="mt-2">We charge a flat monthly subscription for Pro and take <b>no commission</b> on your food sales. Your customers' payments go to your own account arrangement, and our subscription revenue is tracked completely separately. Your customers' personal details are shared only with the restaurant they order from. If something goes wrong, you can message our team from your dashboard and see the status of your report.</p>
        </section>
        <section className="rounded-3xl bg-night p-6 text-white">
          <h2 className="font-display text-xl font-bold">Questions? Talk to a person.</h2>
          <p className="mt-1 text-sm text-white/70">Chat with us on WhatsApp on {PHONE}, or visit the contact page.</p>
          <div className="mt-4 flex flex-wrap gap-3"><a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="btn-primary !bg-[#25D366]">WhatsApp us</a><Link to="/contact" className="btn-ghost !text-ink-900">Contact page</Link></div>
        </section>
      </div>
    </main>
  );
}

const FAQS = [
  ['What is the difference between Free and Pro?', 'Free gives you a menu page (10 active meals), add-ons, a customer messages inbox and WhatsApp orders. Pro adds checkout, Paystack and bank-transfer payments, pay on delivery, distance-priced delivery, pickup, dine-in, order tracking, QR codes, a custom domain and analytics.'],
  ['How much does Pro cost?', 'Pro is ₦7,500 per month, with a 14-day free trial you can start once from your dashboard. There is no commission on your food sales.'],
  ['Do customers need to create an account?', 'No. Customers order without registering.'],
  ['How does delivery pricing work?', 'You set your restaurant\'s location and four numbers: a base fee, the base distance it covers, a price for every extra kilometre, and a maximum radius. When a customer searches their address, the distance is measured on the map and the fee is worked out automatically, rounded up to the next ₦100. Addresses beyond your maximum radius cannot order delivery. If you have not finished this setup, customers will not see a delivery option.'],
  ['Is the delivery distance the road distance?', 'It is the straight-line distance on the map, which can be a little shorter than the road distance. Set your price per extra kilometre with that in mind.'],
  ['Can customers add extras to a meal?', 'Yes. Add add-ons to any meal (for example extra turkey, beef or a drink) with their own prices. Customers pick them on the meal page before adding to the cart.'],
  ['How do customers contact my restaurant?', 'Every restaurant page has a Contact button. Messages appear in the Messages tab of your dashboard and are emailed to you. You can reply from the dashboard and your reply is emailed to the customer.'],
  ['What if I have a problem with the platform?', 'Use the Reports tab in your dashboard. Your report goes to our team and you can follow its progress (received, reviewed, in progress, resolved). You can also reach us on WhatsApp or by phone on the contact page.'],
  ['How do WhatsApp orders work on Free?', 'The customer builds a cart, we save an order request in your dashboard, then open WhatsApp with the order pre-filled. The order is only confirmed once you accept it. Opening WhatsApp does not prove the customer sent the message.'],
  ['Who receives the money from customers?', 'You do. Paystack payments are routed to your own approved merchant or subaccount arrangement. Bank transfers go straight to your account. Ordarly never collects and redistributes your sales.'],
  ['How long does Paystack settlement take?', 'Settlement timing is set by Paystack and your account, so we cannot promise instant settlement. Your dashboard shows payment status, not guaranteed payout times.'],
  ['How does bank transfer verification work?', 'Customers upload a screenshot, but a screenshot never marks an order paid. You check your own bank records and then accept or reject the proof.'],
  ['What happens if my Pro plan expires?', 'You move to Free automatically. Nothing is deleted. If you have more than 10 active meals, they stay, but you cannot activate more until you are within the limit or renew. Delivery and checkout are hidden from customers until you renew.'],
  ['Can I use my own domain?', 'Yes, on Pro. Add the domain in Settings, create the DNS records shown, and verify. If Pro lapses, your page remains available on your Ordarly link.'],
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
  const { supportEmail } = usePlatform();
  const cards = [
    ['WhatsApp', PHONE, WHATSAPP_URL, 'Fastest way to reach us', '💬'],
    ['Phone', PHONE, `tel:${PHONE}`, 'Call us during working hours', '📞'],
    ['Email', supportEmail, `mailto:${supportEmail}`, 'We reply within one business day', '✉️'],
  ];
  return (
    <main>
      <Hero eyebrow="Contact" title="Talk to us" sub="Questions about setup, billing or payments, or a problem to report? Pick whichever way suits you." />
      <div className="mx-auto max-w-4xl px-5">
        <div className="grid gap-4 md:grid-cols-3">
          {cards.map(([t, v, href, d, icon]) => (
            <a key={t} href={href} target={t === 'WhatsApp' ? '_blank' : undefined} rel="noreferrer" className="card block p-5 transition hover:border-brand-500/40">
              <div className="text-2xl" aria-hidden="true">{icon}</div><div className="mt-2 text-xs text-ink-500">{t}</div><div className="break-all font-bold">{v}</div><div className="mt-1 text-xs text-ink-500">{d}</div>
            </a>))}
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-5">
          <div className="card p-5 md:col-span-2"><div className="text-xs text-ink-500">Hours</div><b>Mon–Fri, 9am–5pm WAT</b><p className="mt-3 text-sm text-ink-500">Already a restaurant on Ordarly? You can also send a report from the Reports tab in your dashboard and track its progress.</p></div>
          <div className="card p-6 md:col-span-3"><h2 className="mb-3 font-bold">Send us a message</h2><ReportForm source="contact" /></div>
        </div>
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
      <section><h2>1. About the service</h2><p>Ordarly provides software that lets restaurants publish an online ordering page, manage menus and orders, and, on the Pro plan, accept checkout payments. Ordarly is a technology provider and is not a party to the sale of food between a restaurant and its customers.</p></section>
      <section><h2>2. Accounts</h2><p>You must provide accurate information, keep your credentials secure, and are responsible for activity on your account. We may suspend accounts that breach these terms or applicable law.</p></section>
      <section><h2>3. Plans and billing</h2><p>The Free plan is provided at no charge with the limits shown on our pricing page. Pro is billed monthly at the price shown at purchase. Pro features are enabled only after payment is verified or during an eligible 14-day trial. When Pro expires your account reverts to Free; your data is retained.</p></section>
      <section><h2>4. Food-order payments</h2><p>Each restaurant is an independent merchant. Online payments are processed by Paystack under the restaurant's own approved arrangement, subject to Paystack's terms, fees and settlement schedule. Ordarly does not collect or redistribute food-order proceeds and charges no commission on them. Bank transfers and pay-on-delivery are arranged directly between restaurant and customer; the restaurant is solely responsible for confirming receipt of funds.</p></section>
      <section><h2>5. Restaurant responsibilities</h2><p>Restaurants are responsible for menu accuracy, pricing, food safety, fulfilment, delivery, refunds, and compliance with all applicable laws and licences.</p></section>
      <section><h2>6. Acceptable use</h2><p>You may not use Ordarly for unlawful, fraudulent or misleading activity, to upload harmful content, to interfere with the service, or to access other users' data.</p></section>
      <section><h2>7. Availability and liability</h2><p>We aim for reliable service but do not guarantee uninterrupted availability. To the extent permitted by law, Ordarly is not liable for indirect or consequential loss, or for losses arising from third-party services such as WhatsApp, Paystack, or email providers.</p></section>
      <section><h2>8. Termination</h2><p>You may close your account at any time. We may suspend or terminate accounts for breach or legal reasons.</p></section>
      <section><h2>9. Governing law</h2><p>These terms are governed by the laws of the Federal Republic of Nigeria.</p></section>
      <section><h2>10. Contact</h2><p>Questions about these terms: see our <Link className="text-brand-600 underline" to="/contact">contact page</Link>.</p></section>
    </Doc>
  );
}

export function Privacy() {
  return (
    <Doc title="Privacy Policy" updated="October 2026">
      <section><h2>1. Who we are</h2><p>Ordarly is the data controller for restaurant account data. For customer order data, the restaurant is the controller and Ordarly acts as its processor. We handle personal data in line with the Nigeria Data Protection Act 2023.</p></section>
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
