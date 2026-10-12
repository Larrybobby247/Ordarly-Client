import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, naira } from '../../lib/api';
import { Spinner, Alert, Field } from '../../components/ui';
import { ReportModal } from '../../components/ReportForm';
import { Modal } from '../../components/adminKit';
import PlaceSearch from '../../components/PlaceSearch';
import MapPreview from '../../components/MapPreview';

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));
const lineKey = (mealId, addonIds) => [mealId, ...[...addonIds].sort()].join('|');

export default function Restaurant({ domain }) {
  const { slug } = useParams();
  const [d, setD] = useState(null); const [err, setErr] = useState('');
  const key = domain || slug;
  // Cart lines: { key, mealId, addonIds[], quantity }. The server re-prices everything at checkout.
  const [cart, setCart] = useState(() => { try { const c = JSON.parse(localStorage.getItem('cart2:' + key) || '[]'); return Array.isArray(c) ? c : []; } catch { return []; } });
  const [cat, setCat] = useState(''); const [open, setOpen] = useState(false); const [step, setStep] = useState('cart');
  const [sheet, setSheet] = useState(null); const [report, setReport] = useState(false); const [contact, setContact] = useState(false); const [search, setSearch] = useState('');

  useEffect(() => { setD(null); setErr(''); api.get(domain ? `/public/by-domain/${domain}` : `/public/r/${slug}`).then(setD).catch((e) => setErr(e.message)); }, [domain, slug]);
  useEffect(() => { try { localStorage.setItem('cart2:' + key, JSON.stringify(cart)); } catch { /* storage unavailable */ } }, [cart, key]);

  const meals = d?.meals || [];
  const byId = useMemo(() => new Map(meals.map((m) => [m._id, m])), [meals]);

  // Resolve each line against the live menu. A line is invalid if the meal or one of its add-ons is gone/unavailable.
  const lines = cart.map((l) => {
    const m = byId.get(l.mealId); if (!m) return null;
    const picked = l.addonIds.map((id) => (m.addons || []).find((a) => a._id === id));
    const valid = m.available && picked.every(Boolean);
    const addons = picked.filter(Boolean);
    const unit = m.price + addons.reduce((s, a) => s + a.price, 0);
    return { ...l, m, addons, valid, unit };
  }).filter(Boolean);
  const subtotal = lines.reduce((s, l) => s + (l.valid ? l.unit * l.quantity : 0), 0);
  const count = lines.reduce((s, l) => s + l.quantity, 0);
  const hasInvalid = lines.some((l) => !l.valid);

  const addLine = (mealId, addonIds, qty) => setCart((c) => {
    const k = lineKey(mealId, addonIds); const i = c.findIndex((l) => l.key === k);
    if (i >= 0) return c.map((l, n) => (n === i ? { ...l, quantity: Math.min(50, l.quantity + qty) } : l));
    return [...c, { key: k, mealId, addonIds: [...addonIds], quantity: Math.min(50, qty) }];
  });
  const setQty = (k, q) => setCart((c) => (q <= 0 ? c.filter((l) => l.key !== k) : c.map((l) => (l.key === k ? { ...l, quantity: Math.min(50, q) } : l))));
  const qtyOfMeal = (id) => cart.filter((l) => l.mealId === id).reduce((s, l) => s + l.quantity, 0);

  if (err) return <div className="grid min-h-screen place-items-center p-6 text-center"><div><h1 className="font-display text-3xl font-bold">Restaurant not found</h1><p className="mt-2 text-ink-500">{err}</p>{!domain && <a href="/" className="btn-primary mt-5">Go to Ordarly</a>}</div></div>;
  if (!d) return <Spinner />;
  const r = d.restaurant; const accent = r.accent || '#16a34a'; const isPro = r.plan === 'pro' && d.checkout;
  const needle = search.trim().toLowerCase();
  const shown = meals.filter((m) => (!cat || m.category === cat) && (!needle || [m.name, m.description, ...(m.tags || []), ...(m.addons || []).map((a) => a.name)].some((t) => String(t || '').toLowerCase().includes(needle))));

  const onAdd = (m) => setSheet(m); // always open the meal page: full details + extras, then Add to cart

  return (
    <div className="min-h-screen bg-mint-50 pb-28" style={{ '--accent': accent }}>
      <div className="relative h-44 bg-gradient-to-br from-brand-500 to-brand-700 md:h-60">
        {r.cover && <img src={r.cover} alt="" className="h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>
      <div className="mx-auto mt-12 max-w-5xl px-4">
        <div className="card flex flex-wrap items-center gap-4 p-5">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-brand-100 text-2xl font-bold text-brand-700">{r.logo ? <img src={r.logo} alt={r.name} className="h-full w-full object-cover" /> : r.name[0]}</div>
          <div className="min-w-0 flex-1"><h1 className="font-display text-2xl font-bold">{r.name}</h1><p className="text-sm text-ink-500">{r.description}</p>
            <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-ink-500">{r.address && <span>📍 {r.address}</span>}{r.phone && <span>📞 {r.phone}</span>}</div></div>
          <div className="flex items-center gap-2"><button className="btn-ghost !py-1.5 !text-xs" onClick={() => setContact(true)}>✉ Contact</button><span className={`rounded-full px-3 py-1 text-xs font-bold ${r.isOpen ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-600'}`}>{r.isOpen ? 'Open' : 'Closed'}</span></div>
        </div>
        <div className="relative mt-4">
          <input type="search" aria-label="Search meals" className="input !rounded-full !pl-10" placeholder="Search meals, e.g. jollof, turkey…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
        </div>
        {!r.isOpen && <div className="mt-4"><Alert kind="info">This restaurant is not accepting orders right now. You can browse the menu.</Alert></div>}

        {d.categories.length > 0 && (
          <div className="no-scrollbar sticky top-0 z-10 -mx-4 mt-4 flex gap-2 overflow-x-auto bg-mint-50/90 px-4 py-3 backdrop-blur">
            {[{ _id: '', name: 'All' }, ...d.categories].map((c) => <button key={c._id} onClick={() => setCat(c._id)} className={`chip shrink-0 ${cat === c._id && '!border-brand-500 !bg-brand-500 !text-white'}`}>{c.name}</button>)}
          </div>
        )}

        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((m) => {
            const q = qtyOfMeal(m._id); const hasAddons = (m.addons || []).length > 0;
            return (
              <div key={m._id} role="button" tabIndex={0} aria-label={`View ${m.name}`} onClick={() => onAdd(m)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onAdd(m))}
                className={`card flex cursor-pointer gap-3 overflow-hidden p-3 transition hover:border-brand-500/40 ${!m.available && 'opacity-60'}`}>
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-mint-100">{m.image && <img src={m.image} alt="" loading="lazy" className="h-full w-full object-cover" />}</div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex flex-wrap items-center gap-1.5"><b className="leading-tight">{m.name}</b>{m.popular && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">★ Popular</span>}</div>
                  <p className="line-clamp-2 text-xs text-ink-500">{m.description}</p>
                  <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-ink-500">
                    {m.portion && <span>🍽 {m.portion}</span>}{m.prepTime ? <span>⏱ {m.prepTime} min</span> : null}{hasAddons && <span>+ extras</span>}
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-2"><b className="text-brand-600">{naira(m.price)}</b>
                    {!m.available ? <span className="text-xs font-semibold text-red-500">Unavailable</span> : <span className="rounded-full bg-tomato-500 px-3.5 py-1.5 text-xs font-semibold text-white">{q ? `In cart (${q}) · View` : 'View'}</span>}
                  </div>
                </div>
              </div>
            );
          })}
          {shown.length === 0 && <p className="col-span-full py-10 text-center text-sm text-ink-500">No meals available yet.</p>}
        </div>
      </div>

      {count > 0 && !open && (
        <div className="fixed inset-x-0 bottom-0 z-20 p-4"><button onClick={() => { setStep('cart'); setOpen(true); }} className="btn-dark mx-auto flex w-full max-w-lg justify-between !rounded-3xl !py-4"><span>View cart · {count} item{count > 1 && 's'}</span><span>{naira(subtotal)}</span></button></div>
      )}
      {contact && <ContactModal r={r} onClose={() => setContact(false)} />}
      {sheet && <ItemSheet m={sheet} canOrder={r.isOpen} onClose={() => setSheet(null)} onAdd={(ids, qty) => { addLine(sheet._id, ids, qty); setSheet(null); }} />}
      {open && <CartSheet {...{ d, r, isPro, lines, subtotal, setQty, step, setStep, setCart, hasInvalid, close: () => setOpen(false), slug: r.slug }} />}
      {report && <ReportModal onClose={() => setReport(false)} source="restaurant_page" restaurantSlug={r.slug} defaultKind="complaint" />}
      <p className="mt-10 text-center text-xs text-ink-500">
        Powered by <a href="/" className="font-semibold text-brand-600">Ordarly</a> · <button className="underline" onClick={() => setReport(true)}>Report a problem</button>
      </p>
    </div>
  );
}

// Meal page: full details, extras (add-ons), quantity, then "Add to cart".
function ItemSheet({ m, canOrder, onClose, onAdd }) {
  const [ids, setIds] = useState([]); const [qty, setQty] = useState(1);
  const addons = (m.addons || []);
  const groups = useMemo(() => {
    const g = new Map();
    addons.forEach((a) => { const k = a.group || 'Extras'; if (!g.has(k)) g.set(k, []); g.get(k).push(a); });
    return [...g.entries()];
  }, [addons]);
  useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  const toggle = (id) => setIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const unit = m.price + addons.filter((a) => ids.includes(a._id)).reduce((s, a) => s + a.price, 0);
  const blocked = !m.available || !canOrder;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center md:p-6" onClick={onClose}>
      <div role="dialog" aria-label={m.name} className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-4xl bg-white md:rounded-4xl" onClick={(e) => e.stopPropagation()}>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="relative h-52 bg-mint-100">{m.image && <img src={m.image} alt={m.name} className="h-full w-full object-cover" />}
            <button onClick={onClose} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-xl shadow" aria-label="Close">×</button></div>
          <div className="space-y-4 p-6">
            <div><div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-2xl font-bold">{m.name}</h2>{m.popular && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">★ Popular</span>}</div>
              <div className="mt-1 text-lg font-bold text-brand-600">{naira(m.price)}</div></div>
            {m.description && <p className="whitespace-pre-line text-sm text-ink-700">{m.description}</p>}
            {(m.portion || m.prepTime || (m.tags || []).length > 0) && (
              <div className="flex flex-wrap gap-2 text-xs">{m.portion && <span className="chip">🍽 {m.portion}</span>}{m.prepTime ? <span className="chip">⏱ About {m.prepTime} min</span> : null}{(m.tags || []).map((t) => <span key={t} className="chip">{t}</span>)}</div>)}
            {groups.map(([g, list]) => (
              <div key={g}><div className="label">{g} <span className="font-normal text-ink-500">(optional)</span></div>
                <div className="space-y-2">{list.map((a) => (
                  <label key={a._id} className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-sm ${ids.includes(a._id) ? 'border-brand-500 bg-brand-50' : 'border-ink-300'}`}>
                    <input type="checkbox" checked={ids.includes(a._id)} onChange={() => toggle(a._id)} />
                    <span className="flex-1">{a.name}</span><b>+{naira(a.price)}</b>
                  </label>))}</div></div>))}
          </div>
        </div>
        <div className="shrink-0 border-t border-black/5 p-4">
          {!m.available && <p className="mb-2 text-center text-xs font-semibold text-red-500">This meal is unavailable right now.</p>}
          {m.available && !canOrder && <p className="mb-2 text-center text-xs text-ink-500">The restaurant is closed, so ordering is paused.</p>}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-brand-50 px-1"><button className="h-10 w-10 font-bold" aria-label="Less" onClick={() => setQty(Math.max(1, qty - 1))}>−</button><span className="w-5 text-center font-bold">{qty}</span><button className="h-10 w-10 font-bold" aria-label="More" onClick={() => setQty(Math.min(50, qty + 1))}>+</button></div>
            <button disabled={blocked} className="btn-accent flex-1 !py-3" onClick={() => onAdd(ids, qty)}>Add to cart · {naira(unit * qty)}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Customers write to the restaurant; it lands in the restaurant's Messages tab and email.
function ContactModal({ r, onClose }) {
  const [f, setF] = useState({ name: '', email: '', phone: '', subject: '', message: '', website: '' });
  const [st, setSt] = useState({ busy: false, err: '', ref: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setSt({ busy: true, err: '', ref: '' });
    try { const res = await api.post(`/public/contact/${r.slug}`, { ...f, phone: f.phone || undefined, subject: f.subject || undefined }); setSt({ busy: false, err: '', ref: res.reference || 'sent' }); }
    catch (x) { setSt({ busy: false, err: x.message, ref: '' }); }
  };
  return (
    <Modal title={`Contact ${r.name}`} onClose={onClose}>
      {st.ref ? <Alert kind="ok">Your message was sent{st.ref !== 'sent' && <> (reference <b>{st.ref}</b>)</>}. {r.name} will reply to your email.</Alert> : (
        <form onSubmit={submit} className="space-y-3">
          <p className="text-sm text-ink-500">Ask about a meal, an order or anything else.{r.phone && <> You can also call <b>{r.phone}</b>.</>}</p>
          <Alert>{st.err}</Alert>
          <input className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.website} onChange={set('website')} />
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Your name"><input className="input" required minLength={2} value={f.name} onChange={set('name')} /></Field><Field label="Email"><input type="email" className="input" required value={f.email} onChange={set('email')} /></Field></div>
          <Field label="Phone (optional)"><input className="input" inputMode="tel" value={f.phone} onChange={set('phone')} /></Field>
          <Field label="Subject (optional)"><input className="input" maxLength={120} value={f.subject} onChange={set('subject')} /></Field>
          <Field label="Message"><textarea className="input" rows={4} required minLength={5} maxLength={2000} value={f.message} onChange={set('message')} /></Field>
          <button className="btn-primary w-full" disabled={st.busy}>{st.busy ? 'Sending…' : 'Send message'}</button>
        </form>)}
    </Modal>
  );
}

// Delivery address: search -> pick -> we price it by distance from the restaurant (server-side). House name etc. is a separate field.
function DeliveryPlace({ slug, rules, quote, setQuote }) {
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const search = useMemo(() => (input, token) => api.post(`/public/r/${slug}/places/autocomplete`, { input, sessionToken: token }).then((r) => r.suggestions), [slug]);
  const pick = async (s, token) => {
    setErr(''); setQuote(null);
    if (!s) return;
    setBusy(true);
    try { const q = await api.post(`/public/r/${slug}/delivery-quote`, { placeId: s.placeId, sessionToken: token }); setQuote({ ...q, placeId: s.placeId }); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <div>
      <label className="label" htmlFor="dest">Search your delivery address</label>
      <PlaceSearch id="dest" search={search} onPick={pick} placeholder="Type your street, estate or area…" />
      {busy && <p className="mt-1 text-xs text-ink-500">Checking the delivery price…</p>}
      {quote && rules?.origin && quote.lat != null && <div className="mt-2"><MapPreview origin={rules.origin} dest={{ lat: quote.lat, lng: quote.lng }} height={200} label="Map showing the restaurant and your delivery address" /></div>}
      {quote && <p className="mt-1 text-xs font-semibold text-brand-700">✓ About {quote.distanceKm} km away · delivery {naira(quote.fee)}</p>}
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
      {!quote && !err && !busy && rules && <p className="mt-1 text-xs text-ink-500">Delivery starts at {naira(rules.baseFee)}, and we deliver up to {rules.maxRadiusKm} km away.</p>}
    </div>
  );
}

function CartSheet({ d, r, isPro, lines, subtotal, setQty, step, setStep, setCart, hasInvalid, close, slug }) {
  const co = d.checkout;
  const [f, setF] = useState({ customerName: '', customerEmail: '', customerPhone: '', notes: '', fulfillment: co?.fulfillment.pickup ? 'pickup' : co?.fulfillment.delivery ? 'delivery' : 'dine_in', deliveryPlaceId: '', deliveryAddress: '', tableNumber: '', paymentMethod: '', confirmed: false });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [done, setDone] = useState(null); const [idem] = useState(uid);
  const cartPayload = lines.filter((l) => l.valid).map((l) => ({ mealId: l.mealId, quantity: l.quantity, ...(l.addonIds.length ? { addonIds: l.addonIds } : {}) }));
  const [quote, setQuote] = useState(null);
  const fee = f.fulfillment === 'delivery' && quote ? quote.fee : 0;
  const pms = co ? [co.payments.paystack && ['paystack', 'Pay online (card / transfer) — recommended'], co.payments.bankTransfer && ['bank_transfer', 'Bank transfer'], co.payments.pod && f.fulfillment === 'delivery' && ['pod', 'Pay on delivery']].filter(Boolean) : [];
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const removeInvalid = () => lines.filter((l) => !l.valid).forEach((l) => setQty(l.key, 0));

  const whatsapp = async () => {
    setBusy(true); setErr('');
    try {
      const res = await api.post(`/public/r/${slug}/whatsapp-order`, { cart: cartPayload, customerName: f.customerName || undefined, customerPhone: f.customerPhone || undefined, notes: f.notes || undefined, idempotencyKey: idem });
      setDone({ type: 'wa', ...res }); setCart([]);
      window.open(res.whatsappUrl, '_blank', 'noopener');
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const checkout = async () => {
    setBusy(true); setErr('');
    try {
      const body = { cart: cartPayload, ...f, deliveryPlaceId: f.fulfillment === 'delivery' ? quote?.placeId : undefined, idempotencyKey: idem };
      const res = await api.post(`/public/r/${slug}/checkout`, body);
      setDone({ type: 'pro', ...res }); setCart([]);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const needArea = f.fulfillment === 'delivery' && !quote;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 md:items-center md:p-6" onClick={close}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-4xl bg-white p-6 md:rounded-4xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-xl font-bold">{done ? 'Order received' : step === 'cart' ? 'Your cart' : 'Checkout'}</h2><button onClick={close} className="text-2xl leading-none" aria-label="Close">×</button></div>

        {done?.type === 'wa' && (
          <div className="space-y-4"><Alert kind="info">Your order <b>{done.reference}</b> is a request. It is <b>not confirmed</b> until {r.name} replies on WhatsApp.</Alert>
            <p className="text-sm text-ink-500">If WhatsApp didn't open, tap below to retry, or message the restaurant directly on <b>+{done.restaurantWhatsapp}</b> and quote your reference.</p>
            <a href={done.whatsappUrl} target="_blank" rel="noreferrer" className="btn-primary w-full">Open WhatsApp again</a></div>
        )}
        {done?.type === 'pro' && (
          <div className="space-y-4"><Alert kind="ok">Order <b>{done.reference}</b> placed. Total {naira(done.total)}.</Alert>
            {done.next === 'upload_proof' && <Alert kind="info">Transfer {naira(done.total)} using the details shown at checkout, then open your tracking page to upload your payment proof. Your order stays unpaid until {r.name} confirms the money arrived.</Alert>}
            {done.next === 'pay_online' && <Alert kind="info">Open your tracking page and tap <b>Pay now</b> to complete payment securely with Paystack.</Alert>}
            {done.paymentMethod === 'pod' && <Alert kind="info">Pay the rider/restaurant when your order arrives.</Alert>}
            <Link to={`/track/${done.trackingToken}`} className="btn-primary w-full">Track your order</Link>
            <p className="text-center text-xs text-ink-500">We also emailed you this tracking link. Save it, as anyone with the link can view this order.</p></div>
        )}

        {!done && step === 'cart' && (<>
          <div className="space-y-3">{lines.map((l) => (
            <div key={l.key} className="flex items-center justify-between gap-3 text-sm"><div className="min-w-0"><div className="truncate font-semibold">{l.m.name}</div>
              {l.addons.length > 0 && <div className="text-xs text-ink-500">+ {l.addons.map((a) => a.name).join(', ')}</div>}
              {l.valid ? <div className="text-xs text-ink-500">{naira(l.unit)} each</div> : <div className="text-xs font-semibold text-red-500">{l.m.available ? 'An extra is no longer available' : 'No longer available'}</div>}</div>
              <div className="flex items-center gap-2"><button className="h-7 w-7 rounded-full border" aria-label="Less" onClick={() => setQty(l.key, l.quantity - 1)}>−</button><span className="w-5 text-center font-bold">{l.quantity}</span><button className="h-7 w-7 rounded-full border" aria-label="More" onClick={() => setQty(l.key, l.quantity + 1)}>+</button></div>
              <b className="w-20 text-right">{l.valid ? naira(l.unit * l.quantity) : '—'}</b></div>))}</div>
          <div className="mt-4 flex justify-between border-t pt-3 font-bold"><span>Subtotal</span><span>{naira(subtotal)}</span></div>
          {hasInvalid && <div className="mt-3 space-y-2"><Alert kind="info">Some items are no longer available.</Alert><button className="btn-ghost w-full" onClick={removeInvalid}>Remove unavailable items</button></div>}
          <div className="mt-4 space-y-3">
            {!isPro && (<>
              <Field label="Your name (optional)"><input className="input" value={f.customerName} onChange={set('customerName')} /></Field>
              <Field label="Phone (optional)"><input className="input" inputMode="tel" value={f.customerPhone} onChange={set('customerPhone')} /></Field>
              <Field label="Order notes (optional)"><textarea rows={2} className="input" value={f.notes} onChange={set('notes')} /></Field>
              <p className="text-xs text-ink-500">You'll finish your order on WhatsApp with {r.name}. Payment and pickup are arranged with them directly.</p>
              <Alert>{err}</Alert>
              <button disabled={busy || hasInvalid || !cartPayload.length || !r.isOpen || !r.whatsapp} onClick={whatsapp} className="btn-primary w-full !bg-[#25D366] !py-3.5">{busy ? 'Saving order…' : 'Order on WhatsApp'}</button>
              {!r.whatsapp && <p className="text-xs text-red-500">This restaurant has not set up WhatsApp yet.</p>}
            </>)}
            {isPro && <button disabled={hasInvalid || !cartPayload.length || !r.isOpen} onClick={() => setStep('checkout')} className="btn-accent w-full !py-3.5">Continue to checkout</button>}
          </div></>)}

        {!done && step === 'checkout' && isPro && (
          <form onSubmit={(e) => { e.preventDefault(); checkout(); }} className="space-y-4">
            <Alert>{err}</Alert>
            <Field label="Full name"><input className="input" required value={f.customerName} onChange={set('customerName')} /></Field>
            <div className="grid gap-3 sm:grid-cols-2"><Field label="Email"><input type="email" className="input" required value={f.customerEmail} onChange={set('customerEmail')} /></Field><Field label="Phone"><input className="input" required inputMode="tel" value={f.customerPhone} onChange={set('customerPhone')} /></Field></div>
            <div><div className="label">How would you like your order?</div><div className="flex flex-wrap gap-2">
              {[['delivery', 'Home delivery', co.fulfillment.delivery], ['pickup', 'Pickup', co.fulfillment.pickup], ['dine_in', 'Eat at the restaurant', co.fulfillment.dineIn]].filter(([, , on]) => on).map(([k, l]) => <button type="button" key={k} onClick={() => setF({ ...f, fulfillment: k, paymentMethod: '' })} className={`chip !px-4 !py-2 ${f.fulfillment === k && '!border-brand-500 !bg-brand-50 !text-brand-700'}`}>{l}</button>)}</div></div>
            {f.fulfillment === 'delivery' && (<>
              <DeliveryPlace slug={slug} rules={co.deliveryRules} quote={quote} setQuote={setQuote} />
              <Field label="House / street details" hint="House name or number, street, nearest landmark. This does not change the delivery price."><textarea className="input" rows={2} required minLength={3} placeholder="e.g. Flat 3, Sunrise Court, 12 Adeola Odeku St, near the Shoprite" value={f.deliveryAddress} onChange={set('deliveryAddress')} /></Field></>)}
            {f.fulfillment === 'pickup' && <div className="rounded-2xl bg-mint-50 p-3 text-sm"><b>Pickup address:</b> {r.address}<br />{co.fulfillment.pickupInstructions}</div>}
            {f.fulfillment === 'dine_in' && co.fulfillment.askTableNumber && <Field label="Table number (optional)"><input className="input" value={f.tableNumber} onChange={set('tableNumber')} /></Field>}
            <div><div className="label">Payment</div>
              {pms.length === 0 ? <Alert kind="info">No payment method is available for this option right now.</Alert> : <div className="space-y-2">{pms.map(([k, l]) => <label key={k} className={`flex items-center gap-3 rounded-2xl border p-3 text-sm ${f.paymentMethod === k ? 'border-tomato-500 bg-tomato-50' : 'border-ink-300'}`}><input type="radio" name="pm" required checked={f.paymentMethod === k} onChange={() => setF({ ...f, paymentMethod: k })} />{l}</label>)}</div>}
              {f.paymentMethod === 'bank_transfer' && co.bank && <div className="mt-2 rounded-2xl bg-mint-50 p-3 text-sm"><div className="font-semibold">Transfer to:</div>{co.bank.bankName} · {co.bank.accountName} · <b>{co.bank.accountNumber}</b><p className="mt-1 text-xs text-ink-500">Your order is only marked paid after the restaurant confirms the money arrived.</p></div>}</div>
            <Field label="Notes (optional)"><textarea rows={2} className="input" value={f.notes} onChange={set('notes')} /></Field>
            <div className="space-y-1 rounded-2xl bg-mint-50 p-4 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>{naira(subtotal)}</span></div>{f.fulfillment === 'delivery' && <div className="flex justify-between"><span>Delivery{quote ? ` (${quote.distanceKm} km)` : ''}</span><span>{quote ? naira(fee) : '—'}</span></div>}<div className="flex justify-between text-base font-bold"><span>Total</span><span>{naira(subtotal + fee)}</span></div><p className="text-xs text-ink-500">Final amount is recalculated securely when you place the order.</p></div>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={f.confirmed} onChange={(e) => setF({ ...f, confirmed: e.target.checked })} />I confirm my order and details are correct.</label>
            <div className="flex gap-2"><button type="button" className="btn-ghost" onClick={() => setStep('cart')}>Back</button><button disabled={busy || !f.confirmed || !f.paymentMethod || needArea} className="btn-accent flex-1 !py-3">{busy ? 'Placing…' : needArea ? 'Search your address' : 'Place order'}</button></div>
          </form>
        )}
      </div>
    </div>
  );
}
