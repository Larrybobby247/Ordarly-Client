import { useState } from 'react';
import { api, naira } from '../../lib/api';
import { Alert } from '../../components/ui';
import { optimizeImage } from '../../lib/img';

const todayHours = (hours = []) => {
  if (!hours.length) return null;
  const h = hours.find((x) => x.day === new Date().getDay());
  return h ? (h.closed ? 'Closed today' : `Today ${h.open}–${h.close}`) : null;
};

function BranchCard({ b, onPick, active, busy }) {
  return (
    <button type="button" disabled={busy} onClick={() => onPick(b)} className={`card w-full space-y-1.5 p-4 text-left transition hover:border-brand-500/50 ${active ? 'ring-2 ring-brand-500' : ''}`}>
      <div className="flex items-start justify-between gap-2"><b className="text-base">{b.name}</b>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${b.isOpen ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-600'}`}>{b.isOpen ? 'Open now' : 'Closed'}</span></div>
      {b.address && <div className="text-sm text-ink-700">📍 {b.address}</div>}
      {b.phone && <div className="text-xs text-ink-500">📞 {b.phone}</div>}
      <div className="flex flex-wrap gap-1.5 pt-1 text-[11px] text-ink-500">
        {b.delivery && <span className="chip">🛵 Delivery</span>}{b.pickup && <span className="chip">🥡 Pickup</span>}{b.dineIn && <span className="chip">🍽 Dine-in</span>}
        {b.prepTime ? <span className="chip">⏱ ~{b.prepTime} min</span> : null}{todayHours(b.openingHours) && <span className="chip">{todayHours(b.openingHours)}</span>}
      </div>
    </button>
  );
}

/** Shown INSTEAD of the menu until the customer has chosen where they are ordering from. */
export function BranchPicker({ d, onPick }) {
  const r = d.restaurant; const accent = r.accent || '#16a34a';
  return (
    <div className="min-h-screen bg-mint-50 pb-10" style={{ '--accent': accent }}>
      <div className="relative h-40 bg-gradient-to-br from-brand-500 to-brand-700 md:h-52">
        {r.cover && <img src={optimizeImage(r.cover, 640, 1600)} alt="" className="h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>
      <div className="mx-auto -mt-10 max-w-2xl px-4">
        <div className="card flex items-center gap-4 p-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-brand-100 text-2xl font-bold text-brand-700">{r.logo ? <img src={optimizeImage(r.logo, 80)} alt={r.name} width="64" height="64" className="h-full w-full object-cover" /> : r.name[0]}</div>
          <div className="min-w-0"><h1 className="break-words font-display text-xl font-bold leading-tight sm:text-2xl">{r.name}</h1>{r.description && <p className="mt-0.5 line-clamp-2 text-sm text-ink-500">{r.description}</p>}</div>
        </div>
        <h2 className="mb-1 mt-6 font-display text-lg font-bold">Choose your branch</h2>
        <p className="mb-3 text-sm text-ink-500">Menu, prices, opening hours and delivery depend on the branch you order from.</p>
        <div className="space-y-3">{d.branches.map((b) => <BranchCard key={b._id} b={b} onPick={() => onPick(b._id)} />)}</div>
      </div>
    </div>
  );
}

/**
 * Switching branches with items in the cart. We ask the server what the CURRENT cart would look like at the new branch, then show
 * unavailable items and price changes and wait for an explicit confirmation. Nothing is moved silently.
 */
export function BranchSwitchModal({ d, cart, lines, onClose, onSwitch }) {
  const slug = d.restaurant.slug; const current = d.branch?._id;
  const [target, setTarget] = useState(null); const [res, setRes] = useState(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const nameOf = (i) => lines.find((l) => l.key === cart[i]?.key)?.m?.name || 'An item';
  const oldUnit = (i) => lines.find((l) => l.key === cart[i]?.key)?.unit;

  const choose = async (b) => {
    if (b._id === current) return onClose();
    setErr('');
    if (!cart.length) return onSwitch(b._id, []); // empty cart: nothing to check
    setBusy(true);
    try {
      const payload = cart.map(({ mealId, quantity, sizeId, addonIds }) => ({ mealId, quantity, ...(sizeId ? { sizeId } : {}), ...(addonIds?.length ? { addonIds } : {}) }));
      const r = await api.post(`/public/r/${slug}/validate-cart`, { cart: payload, branchId: b._id });
      const gone = [], changed = [];
      r.lines.forEach((ln) => {
        if (!ln.ok) gone.push(ln.index);
        else if (oldUnit(ln.index) != null && Math.abs(ln.unitPrice - oldUnit(ln.index)) > 0.001) changed.push({ index: ln.index, from: oldUnit(ln.index), to: ln.unitPrice });
      });
      if (!gone.length && !changed.length) return onSwitch(b._id, []); // everything is available at the same prices
      setTarget(b); setRes({ gone, changed });
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center md:p-6" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-4xl bg-white p-6 md:rounded-4xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-xl font-bold">{target ? `Switch to ${target.name}?` : 'Change branch'}</h2><button onClick={onClose} className="text-2xl leading-none" aria-label="Close">×</button></div>
        {err && <Alert>{err}</Alert>}
        {!target ? (
          <div className="space-y-3">{d.branches.map((b) => <BranchCard key={b._id} b={b} active={b._id === current} busy={busy} onPick={choose} />)}{busy && <p className="text-xs text-ink-500">Checking your cart at that branch…</p>}</div>
        ) : (
          <div className="space-y-4">
            <Alert kind="info">Your cart is different at {target.name}. Please review before we switch.</Alert>
            {res.gone.length > 0 && <div className="rounded-2xl bg-red-50 p-3 text-sm"><b className="text-red-700">Not available at {target.name} (will be removed)</b><ul className="mt-1 list-disc pl-5">{res.gone.map((i) => <li key={i}>{nameOf(i)}</li>)}</ul></div>}
            {res.changed.length > 0 && <div className="rounded-2xl bg-amber-50 p-3 text-sm"><b className="text-amber-800">Price changes</b><ul className="mt-1 space-y-0.5">{res.changed.map((c) => <li key={c.index}>{nameOf(c.index)}: {naira(c.from)} → <b>{naira(c.to)}</b> each</li>)}</ul></div>}
            <div className="flex gap-2"><button className="btn-ghost flex-1" onClick={() => { setTarget(null); setRes(null); }}>Keep my branch</button>
              <button className="btn-accent flex-1" onClick={() => onSwitch(target._id, res.gone.map((i) => cart[i].key))}>Switch & update cart</button></div>
          </div>)}
      </div>
    </div>
  );
}
