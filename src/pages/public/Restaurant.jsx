import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, naira } from '../../lib/api';
import { Spinner, Alert, Field } from '../../components/ui';

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));

export default function Restaurant({ domain }) {
  const { slug } = useParams();
  const [d, setD] = useState(null); const [err, setErr] = useState('');
  const key = domain || slug;
  const [cart, setCart] = useState(() => { try { return JSON.parse(localStorage.getItem('cart:' + key) || '{}'); } catch { return {}; } });
  const [cat, setCat] = useState(''); const [open, setOpen] = useState(false); const [step, setStep] = useState('cart');

  useEffect(() => { api.get(domain ? `/public/by-domain/${domain}` : `/public/r/${slug}`).then(setD).catch((e) => setErr(e.message)); }, [domain, slug]);
  useEffect(() => { try { localStorage.setItem('cart:' + key, JSON.stringify(cart)); } catch {} }, [cart, key]);

  const meals = d?.meals || [];
  const byId = useMemo(() => new Map(meals.map((m) => [m._id, m])), [meals]);
  const lines = Object.entries(cart).map(([id, q]) => ({ m: byId.get(id), q, id })).filter((l) => l.m);
  const subtotal = lines.reduce((s, l) => s + (l.m.available ? l.m.price * l.q : 0), 0);
  const count = lines.reduce((s, l) => s + l.q, 0);
  const setQty = (id, q) => setCart((c) => { const n = { ...c }; q <= 0 ? delete n[id] : (n[id] = Math.min(50, q)); return n; });

  if (err) return <div className="grid min-h-screen place-items-center p-6 text-center"><div><h1 className="font-display text-3xl font-bold">Restaurant not found</h1><p className="mt-2 text-ink-500">{err}</p>{!domain && <Link to="/" className="btn-primary mt-5">Go to Orderly</Link>}</div></div>;
  if (!d) return <Spinner />;
  const r = d.restaurant; const accent = r.accent || '#16a34a'; const isPro = r.plan === 'pro' && d.checkout;
  const shown = meals.filter((m) => !cat || m.category === cat);

  return (
    <div className="min-h-screen bg-mint-50 pb-28" style={{ '--accent': accent }}>
      <div className="relative h-44 bg-gradient-to-br from-brand-500 to-brand-700 md:h-60">
        {r.cover && <img src={r.cover} alt="" className="h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>
      <div className="mx-auto -mt-12 max-w-5xl px-4">
        <div className="card flex flex-wrap items-center gap-4 p-5">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-brand-100 text-2xl font-bold text-brand-700">{r.logo ? <img src={r.logo} alt={r.name} className="h-full w-full object-cover" /> : r.name[0]}</div>
          <div className="min-w-0 flex-1"><h1 className="font-display text-2xl font-bold">{r.name}</h1><p className="text-sm text-ink-500">{r.description}</p>
            <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-ink-500">{r.address && <span>📍 {r.address}</span>}{r.phone && <span>📞 {r.phone}</span>}</div></div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${r.isOpen ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-600'}`}>{r.isOpen ? 'Open' : 'Closed'}</span>
        </div>
        {!r.isOpen && <div className="mt-4"><Alert kind="info">This restaurant is not accepting orders right now. You can browse the menu.</Alert></div>}

        {d.categories.length > 0 && (
          <div className="no-scrollbar sticky top-0 z-10 -mx-4 mt-4 flex gap-2 overflow-x-auto bg-mint-50/90 px-4 py-3 backdrop-blur">
            {[{ _id: '', name: 'All' }, ...d.categories].map((c) => <button key={c._id} onClick={() => setCat(c._id)} className={`chip shrink-0 ${cat === c._id && '!border-brand-500 !bg-brand-500 !text-white'}`}>{c.name}</button>)}
          </div>
        )}

        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((m) => (
            <div key={m._id} className={`card flex gap-3 overflow-hidden p-3 ${!m.available && 'opacity-60'}`}>
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-mint-100">{m.image && <img src={m.image} alt={m.name} loading="lazy" className="h-full w-full object-cover" />}</div>
              <div className="flex min-w-0 flex-1 flex-col">
                <b className="leading-tight">{m.name}</b><p className="line-clamp-2 text-xs text-ink-500">{m.description}</p>
                <div className="mt-auto flex items-center justify-between pt-2"><b className="text-brand-600">{naira(m.price)}</b>
                  {!m.available ? <span className="text-xs font-semibold text-red-500">Unavailable</span> : cart[m._id] ? (
                    <div className="flex items-center gap-2 rounded-full bg-brand-50 px-1"><button className="h-7 w-7 font-bold" onClick={() => setQty(m._id, cart[m._id] - 1)}>−</button><span className="text-sm font-bold">{cart[m._id]}</span><button className="h-7 w-7 font-bold" onClick={() => setQty(m._id, cart[m._id] + 1)}>+</button></div>
                  ) : <button disabled={!r.isOpen} className="btn-accent !px-4 !py-1.5 !text-xs" onClick={() => setQty(m._id, 1)}>Add</button>}
                </div>
              </div>
            </div>
          ))}
          {shown.length === 0 && <p className="col-span-full py-10 text-center text-sm text-ink-500">No meals available yet.</p>}
        </div>
      </div>

      {count > 0 && !open && (
        <div className="fixed inset-x-0 bottom-0 z-20 p-4"><button onClick={() => { setStep('cart'); setOpen(true); }} className="btn-dark mx-auto flex w-full max-w-lg justify-between !rounded-3xl !py-4"><span>View cart · {count} item{count > 1 && 's'}</span><span>{naira(subtotal)}</span></button></div>
      )}
      {open && <CartSheet {...{ d, r, isPro, lines, subtotal, setQty, step, setStep, cart, setCart, close: () => setOpen(false), slug: d.restaurant.slug }} />}
      <p className="mt-10 text-center text-xs text-ink-500">Powered by <a href="/" className="font-semibold text-brand-600">Orderly</a></p>
    </div>
  );
}

function CartSheet({ d, r, isPro, lines, subtotal, setQty, step, setStep, cart, setCart, close, slug }) {
  const co = d.checkout;
  const [f, setF] = useState({ customerName: '', customerEmail: '', customerPhone: '', notes: '', fulfillment: co?.fulfillment.pickup ? 'pickup' : co?.fulfillment.delivery ? 'delivery' : 'dine_in', deliveryState: '', deliveryAddress: '', tableNumber: '', paymentMethod: '', confirmed: false });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [done, setDone] = useState(null); const [idem] = useState(uid);
  const cartPayload = Object.entries(cart).filter(([id]) => lines.find((l) => l.id === id && l.m.available)).map(([mealId, quantity]) => ({ mealId, quantity }));
  const hasUnavailable = lines.some((l) => !l.m.available);
  const zone = co?.zones?.find((z) => z.state === f.deliveryState);
  const fee = f.fulfillment === 'delivery' && zone ? zone.fee : 0;
  const pms = co ? [co.payments.paystack && ['paystack', 'Pay online (card / transfer) — recommended'], co.payments.bankTransfer && ['bank_transfer', 'Bank transfer'], co.payments.pod && f.fulfillment === 'delivery' && ['pod', 'Pay on delivery']].filter(Boolean) : [];
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const whatsapp = async () => {
    setBusy(true); setErr('');
    try {
      const res = await api.post(`/public/r/${slug}/whatsapp-order`, { cart: cartPayload, customerName: f.customerName || undefined, customerPhone: f.customerPhone || undefined, notes: f.notes || undefined, idempotencyKey: idem });
      setDone({ type: 'wa', ...res }); setCart({});
      window.open(res.whatsappUrl, '_blank', 'noopener');
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const checkout = async () => {
    setBusy(true); setErr('');
    try {
      const res = await api.post(`/public/r/${slug}/checkout`, { cart: cartPayload, ...f, deliveryState: f.deliveryState || undefined, idempotencyKey: idem });
      setDone({ type: 'pro', ...res }); setCart({});
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 md:items-center md:p-6" onClick={close}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-4xl bg-white p-6 md:rounded-4xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-xl font-bold">{done ? 'Order received' : step === 'cart' ? 'Your cart' : 'Checkout'}</h2><button onClick={close} className="text-2xl leading-none">×</button></div>

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
          <div className="space-y-3">{lines.map(({ m, q, id }) => (
            <div key={id} className="flex items-center justify-between gap-3 text-sm"><div className="min-w-0"><div className="truncate font-semibold">{m.name}</div>{m.available ? <div className="text-xs text-ink-500">{naira(m.price)} each</div> : <div className="text-xs font-semibold text-red-500">No longer available</div>}</div>
              <div className="flex items-center gap-2"><button className="h-7 w-7 rounded-full border" onClick={() => setQty(id, q - 1)}>−</button><span className="w-5 text-center font-bold">{q}</span><button className="h-7 w-7 rounded-full border" onClick={() => setQty(id, q + 1)}>+</button></div>
              <b className="w-20 text-right">{m.available ? naira(m.price * q) : '—'}</b></div>))}</div>
          <div className="mt-4 flex justify-between border-t pt-3 font-bold"><span>Subtotal</span><span>{naira(subtotal)}</span></div>
          {hasUnavailable && <div className="mt-3"><Alert kind="info">Remove unavailable items to continue.</Alert></div>}
          <div className="mt-4 space-y-3">
            {!isPro && (<>
              <Field label="Your name (optional)"><input className="input" value={f.customerName} onChange={set('customerName')} /></Field>
              <Field label="Phone (optional)"><input className="input" inputMode="tel" value={f.customerPhone} onChange={set('customerPhone')} /></Field>
              <Field label="Order notes (optional)"><textarea rows={2} className="input" value={f.notes} onChange={set('notes')} /></Field>
              <p className="text-xs text-ink-500">You'll finish your order on WhatsApp with {r.name}. Payment and pickup are arranged with them directly.</p>
              <Alert>{err}</Alert>
              <button disabled={busy || hasUnavailable || !r.isOpen || !r.whatsapp} onClick={whatsapp} className="btn-primary w-full !bg-[#25D366] !py-3.5">{busy ? 'Saving order…' : 'Order on WhatsApp'}</button>
              {!r.whatsapp && <p className="text-xs text-red-500">This restaurant has not set up WhatsApp yet.</p>}
            </>)}
            {isPro && <button disabled={hasUnavailable || !r.isOpen} onClick={() => setStep('checkout')} className="btn-accent w-full !py-3.5">Continue to checkout</button>}
          </div></>)}

        {!done && step === 'checkout' && isPro && (
          <form onSubmit={(e) => { e.preventDefault(); checkout(); }} className="space-y-4">
            <Alert>{err}</Alert>
            <Field label="Full name"><input className="input" required value={f.customerName} onChange={set('customerName')} /></Field>
            <div className="grid gap-3 sm:grid-cols-2"><Field label="Email"><input type="email" className="input" required value={f.customerEmail} onChange={set('customerEmail')} /></Field><Field label="Phone"><input className="input" required inputMode="tel" value={f.customerPhone} onChange={set('customerPhone')} /></Field></div>
            <div><div className="label">How would you like your order?</div><div className="flex flex-wrap gap-2">
              {[['delivery', 'Home delivery', co.fulfillment.delivery], ['pickup', 'Pickup', co.fulfillment.pickup], ['dine_in', 'Eat at the restaurant', co.fulfillment.dineIn]].filter(([, , on]) => on).map(([k, l]) => <button type="button" key={k} onClick={() => setF({ ...f, fulfillment: k, paymentMethod: '' })} className={`chip !px-4 !py-2 ${f.fulfillment === k && '!border-brand-500 !bg-brand-50 !text-brand-700'}`}>{l}</button>)}</div></div>
            {f.fulfillment === 'delivery' && (<>
              <Field label="State"><select className="input" required value={f.deliveryState} onChange={set('deliveryState')}><option value="">Select state</option>{co.zones.map((z) => <option key={z.state} value={z.state}>{z.state} — {naira(z.fee)}</option>)}</select></Field>
              <Field label="Delivery address"><textarea className="input" rows={2} required minLength={5} value={f.deliveryAddress} onChange={set('deliveryAddress')} /></Field></>)}
            {f.fulfillment === 'pickup' && <div className="rounded-2xl bg-mint-50 p-3 text-sm"><b>Pickup address:</b> {r.address}<br />{co.fulfillment.pickupInstructions}</div>}
            {f.fulfillment === 'dine_in' && co.fulfillment.askTableNumber && <Field label="Table number (optional)"><input className="input" value={f.tableNumber} onChange={set('tableNumber')} /></Field>}
            <div><div className="label">Payment</div>
              {pms.length === 0 ? <Alert kind="info">No payment method is available for this option right now.</Alert> : <div className="space-y-2">{pms.map(([k, l]) => <label key={k} className={`flex items-center gap-3 rounded-2xl border p-3 text-sm ${f.paymentMethod === k ? 'border-tomato-500 bg-tomato-50' : 'border-ink-300'}`}><input type="radio" name="pm" required checked={f.paymentMethod === k} onChange={() => setF({ ...f, paymentMethod: k })} />{l}</label>)}</div>}
              {f.paymentMethod === 'bank_transfer' && co.bank && <div className="mt-2 rounded-2xl bg-mint-50 p-3 text-sm"><div className="font-semibold">Transfer to:</div>{co.bank.bankName} · {co.bank.accountName} · <b>{co.bank.accountNumber}</b><p className="mt-1 text-xs text-ink-500">Your order is only marked paid after the restaurant confirms the money arrived.</p></div>}</div>
            <Field label="Notes (optional)"><textarea rows={2} className="input" value={f.notes} onChange={set('notes')} /></Field>
            <div className="space-y-1 rounded-2xl bg-mint-50 p-4 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>{naira(subtotal)}</span></div>{f.fulfillment === 'delivery' && <div className="flex justify-between"><span>Delivery</span><span>{zone ? naira(fee) : '—'}</span></div>}<div className="flex justify-between text-base font-bold"><span>Total</span><span>{naira(subtotal + fee)}</span></div><p className="text-xs text-ink-500">Final amount is recalculated securely when you place the order.</p></div>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={f.confirmed} onChange={(e) => setF({ ...f, confirmed: e.target.checked })} />I confirm my order and details are correct.</label>
            <div className="flex gap-2"><button type="button" className="btn-ghost" onClick={() => setStep('cart')}>Back</button><button disabled={busy || !f.confirmed || !f.paymentMethod} className="btn-accent flex-1 !py-3">{busy ? 'Placing…' : 'Place order'}</button></div>
          </form>
        )}
      </div>
    </div>
  );
}
