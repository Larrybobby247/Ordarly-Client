import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, naira } from '../../lib/api';
import { Alert, Badge, Field, Spinner } from '../../components/ui';
import PlaceSearch from '../../components/PlaceSearch';
import { useDash } from '../../components/DashboardLayout';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const defaultHours = () => DAYS.map((_, day) => ({ day, open: '08:00', close: '21:00', closed: false }));
const blank = () => ({ name: '', address: '', placeId: '', phone: '', whatsapp: '', prepTimeMinutes: '', acceptingOrders: true, ownHours: false, openingHours: defaultHours(),
  pickupEnabled: true, dineInEnabled: false, deliveryEnabled: false, pickupInstructions: '', radius: { baseFee: '', baseDistanceKm: '', perKmRate: '', maxRadiusKm: '' } });
const fromBranch = (b) => ({
  name: b.name, address: b.address || '', placeId: '', phone: b.phone || '', whatsapp: b.whatsapp || '', prepTimeMinutes: b.prepTimeMinutes ?? '', acceptingOrders: b.acceptingOrders !== false,
  ownHours: !!b.openingHours?.length, openingHours: b.openingHours?.length ? DAYS.map((_, day) => b.openingHours.find((h) => h.day === day) || { day, open: '08:00', close: '21:00', closed: true }) : defaultHours(),
  pickupEnabled: b.fulfillment?.pickupEnabled !== false, dineInEnabled: !!b.fulfillment?.dineInEnabled, deliveryEnabled: !!b.fulfillment?.deliveryEnabled, pickupInstructions: b.fulfillment?.pickupInstructions || '',
  radius: { baseFee: b.fulfillment?.radius?.baseFee ?? '', baseDistanceKm: b.fulfillment?.radius?.baseDistanceKm ?? '', perKmRate: b.fulfillment?.radius?.perKmRate ?? '', maxRadiusKm: b.fulfillment?.radius?.maxRadiusKm ?? '' },
});

function BranchForm({ initial, onSaved, onCancel, id }) {
  const [f, setF] = useState(initial); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const set = (p) => setF((x) => ({ ...x, ...p }));
  const setHour = (i, k, v) => setF((x) => ({ ...x, openingHours: x.openingHours.map((h, j) => (j === i ? { ...h, [k]: v } : h)) }));
  const search = useCallback((input, sessionToken) => api.post('/branches/places/autocomplete', { input, sessionToken }).then((r) => r.suggestions), []);
  const rad = f.radius;
  const save = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const body = {
        name: f.name.trim(), address: f.address, phone: f.phone, whatsapp: f.whatsapp, acceptingOrders: f.acceptingOrders,
        prepTimeMinutes: f.prepTimeMinutes === '' ? null : Number(f.prepTimeMinutes),
        openingHours: f.ownHours ? f.openingHours.map((h) => ({ day: h.day, open: h.open, close: h.close, closed: !!h.closed })) : [],
        fulfillment: { pickupEnabled: f.pickupEnabled, dineInEnabled: f.dineInEnabled, deliveryEnabled: f.deliveryEnabled, pickupInstructions: f.pickupInstructions,
          ...(rad.maxRadiusKm !== '' ? { radius: { baseFee: Number(rad.baseFee) || 0, baseDistanceKm: Number(rad.baseDistanceKm) || 1, perKmRate: Number(rad.perKmRate) || 0, maxRadiusKm: Number(rad.maxRadiusKm) } } : {}) },
      };
      if (f.placeId) body.placeId = f.placeId;
      if (!body.phone) delete body.phone; if (!body.whatsapp) delete body.whatsapp;
      const r = id ? await api.patch(`/branches/${id}`, body) : await api.post('/branches', body);
      onSaved(r.branch);
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={save} className="card space-y-4 p-6">
      <h3 className="font-bold">{id ? 'Edit branch' : 'Add a branch'}</h3>
      {err && <Alert>{err}</Alert>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Branch name"><input className="input" required minLength={2} maxLength={80} placeholder="e.g. Bodija branch" value={f.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <Field label="Phone"><input className="input" value={f.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="0801 234 5678" /></Field>
        <Field label="Address & location" hint="Pick from the list: this sets where delivery distance is measured from.">
          <PlaceSearch search={search} initial={f.address} onText={(t) => set({ address: t })} onPick={(s) => set({ placeId: s.placeId })} placeholder="Search the branch address…" />
        </Field>
        <Field label="WhatsApp (optional)"><input className="input" value={f.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} placeholder="2348012345678" /></Field>
        <Field label="Estimated preparation time (minutes)"><input className="input" type="number" min="0" max="600" value={f.prepTimeMinutes} onChange={(e) => set({ prepTimeMinutes: e.target.value })} /></Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={f.acceptingOrders} onChange={(e) => set({ acceptingOrders: e.target.checked })} />Accepting orders</label>
      </div>

      <div className="rounded-2xl bg-mint-50 p-4">
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={f.ownHours} onChange={(e) => set({ ownHours: e.target.checked })} />This branch has its own opening hours</label>
        {!f.ownHours ? <p className="mt-1 text-xs text-ink-500">Uses the restaurant's opening hours.</p> : (
          <div className="mt-3 space-y-1.5">{f.openingHours.map((h, i) => (
            <div key={h.day} className="flex flex-wrap items-center gap-2 text-sm"><span className="w-10 font-semibold">{DAYS[h.day]}</span>
              <input type="time" className="input !w-auto !py-1" disabled={h.closed} value={h.open} onChange={(e) => setHour(i, 'open', e.target.value)} />–
              <input type="time" className="input !w-auto !py-1" disabled={h.closed} value={h.close} onChange={(e) => setHour(i, 'close', e.target.value)} />
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={!!h.closed} onChange={(e) => setHour(i, 'closed', e.target.checked)} />Closed</label></div>))}</div>)}
      </div>

      <div className="rounded-2xl bg-mint-50 p-4">
        <div className="mb-2 text-sm font-semibold">How customers get their order here</div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.pickupEnabled} onChange={(e) => set({ pickupEnabled: e.target.checked })} />Pickup</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.dineInEnabled} onChange={(e) => set({ dineInEnabled: e.target.checked })} />Dine-in</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.deliveryEnabled} onChange={(e) => set({ deliveryEnabled: e.target.checked })} />Delivery</label>
        </div>
        {f.pickupEnabled && <input className="input mt-2" placeholder="Pickup instructions (optional)" maxLength={300} value={f.pickupInstructions} onChange={(e) => set({ pickupInstructions: e.target.value })} />}
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          {[['baseFee', 'Base fee (₦)'], ['baseDistanceKm', 'Base distance (km)'], ['perKmRate', 'Per extra km (₦)'], ['maxRadiusKm', 'Max radius (km)']].map(([k, l]) => (
            <label key={k} className="text-xs">{l}<input type="number" min="0" step="any" className="input mt-1" value={rad[k]} onChange={(e) => set({ radius: { ...rad, [k]: e.target.value } })} /></label>))}
        </div>
        <p className="mt-1 text-xs text-ink-500">Delivery needs this branch's own address (picked from the list) and radius. Fee = base fee, plus the per-km rate beyond the base distance.</p>
      </div>
      <div className="flex gap-2"><button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save branch'}</button><button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button></div>
    </form>
  );
}

function BranchMenu({ branch, onClose }) {
  const [d, setD] = useState(null); const [err, setErr] = useState(''); const [saving, setSaving] = useState('');
  useEffect(() => { api.get(`/branches/${branch._id}/menu`).then(setD).catch((e) => setErr(e.message)); }, [branch._id]);
  const save = async (m, patch) => {
    setSaving(m._id); setErr('');
    try {
      const cur = m.override || {};
      const body = { available: cur.available ?? null, price: cur.price ?? null, sizes: cur.sizes || [], ...patch };
      const r = await api.put(`/branches/${branch._id}/menu/${m._id}`, body);
      setD((x) => ({ ...x, meals: x.meals.map((y) => (y._id === m._id ? { ...y, override: r.override } : y)) }));
    } catch (e) { setErr(e.message); } finally { setSaving(''); }
  };
  const sizeOv = (m, id) => (m.override?.sizes || []).find((s) => s.sizeId === id);
  const setSize = (m, id, patch) => {
    const rest = (m.override?.sizes || []).filter((s) => s.sizeId !== id); const cur = sizeOv(m, id) || { sizeId: id };
    save(m, { sizes: [...rest, { ...cur, ...patch }] });
  };
  return (
    <div className="card space-y-3 p-6">
      <div className="flex items-center justify-between"><div><h3 className="font-bold">{branch.name}: menu & prices</h3><p className="text-xs text-ink-500">Starts from your shared menu. Mark an item sold out here, or give it a different price at this branch.</p></div><button className="btn-ghost !py-1" onClick={onClose}>Done</button></div>
      {err && <Alert>{err}</Alert>}
      {!d ? <Spinner /> : d.meals.length === 0 ? <p className="text-sm text-ink-500">Add meals to the shared menu first.</p> : (
        <div className="divide-y divide-black/5">{d.meals.map((m) => (
          <div key={m._id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
            <div className="min-w-[10rem] flex-1"><div className="font-semibold">{m.name}</div><div className="text-xs text-ink-500">{m.sizes?.length ? `${m.sizes.length} sizes` : `Shared price ${naira(m.price)}`}{!m.available && ' · sold out everywhere'}</div></div>
            <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" disabled={saving === m._id} checked={m.override?.available !== false} onChange={(e) => save(m, { available: e.target.checked ? null : false })} />Available here</label>
            {m.sizes?.length ? (
              <div className="w-full space-y-1 pl-1">{m.sizes.map((z) => (
                <div key={z._id} className="flex flex-wrap items-center gap-2 text-xs"><span className="w-40 truncate">{z.name} <span className="text-ink-500">({naira(z.price)})</span></span>
                  <input type="number" min="0" className="input !w-28 !py-1" placeholder="Branch price" defaultValue={sizeOv(m, z._id)?.price ?? ''} onBlur={(e) => { const v = e.target.value === '' ? null : Number(e.target.value); if (v !== (sizeOv(m, z._id)?.price ?? null)) setSize(m, z._id, { price: v }); }} />
                  <label className="flex items-center gap-1"><input type="checkbox" checked={sizeOv(m, z._id)?.available !== false} onChange={(e) => setSize(m, z._id, { available: e.target.checked ? null : false })} />Available</label></div>))}</div>
            ) : (
              <input type="number" min="0" className="input !w-32 !py-1" placeholder={`Price (${m.price})`} defaultValue={m.override?.price ?? ''} onBlur={(e) => { const v = e.target.value === '' ? null : Number(e.target.value); if (v !== (m.override?.price ?? null)) save(m, { price: v }); }} />
            )}
          </div>))}</div>)}
    </div>
  );
}

export default function Branches() {
  const { data, reload, access } = useDash();
  const [d, setD] = useState(null); const [err, setErr] = useState(''); const [view, setView] = useState(null); // {mode:'form'|'menu', branch?}
  const load = useCallback(() => api.get('/branches').then(setD).catch((e) => { setErr(e.message); setD({ branches: [], limit: {} }); }), []);
  useEffect(() => { if (data?.isBusiness) load(); }, [data?.isBusiness, load]);

  if (!data?.isBusiness) return (
    <div className="mx-auto max-w-2xl"><div className="card p-8 text-center">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-violet-50 text-xl text-violet-600">⌘</div>
      <h1 className="font-display text-2xl font-bold">Run more than one location</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">The Business plan gives you branches with their own menus, prices, opening hours and delivery, one dashboard for all of them, branch managers and staff with role-based access, and combined earnings reports.</p>
      {access.isOwner ? <Link to="/dashboard/subscription" className="btn-accent mt-5">See the Business plan</Link> : <p className="mt-4 text-sm text-ink-500">Ask the owner to upgrade.</p>}
    </div></div>);
  if (!d) return <Spinner />;

  const toggle = async (b) => { setErr(''); try { await api.post(`/branches/${b._id}/status`, { status: b.status === 'active' ? 'inactive' : 'active' }); load(); reload(); } catch (e) { setErr(e.message); } };
  const done = () => { setView(null); load(); reload(); };
  const canManage = access.can('branches');

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="font-display text-2xl font-bold">Branches</h1><p className="text-sm text-ink-500">{d.limit.have} of {d.limit.max} branches used. Customers choose a branch before ordering when two or more are active.</p></div>
        {canManage && !view && <button className="btn-primary" disabled={!d.limit.canAdd} onClick={() => setView({ mode: 'form' })}>+ Add branch</button>}</div>
      {err && <Alert>{err}</Alert>}
      {!d.limit.canAdd && canManage && d.limit.have >= d.limit.max && <Alert kind="info">You have reached your branch limit. Contact Ordarly to add more.</Alert>}

      {view?.mode === 'form' && <BranchForm id={view.branch?._id} initial={view.branch ? fromBranch(view.branch) : blank()} onSaved={done} onCancel={() => setView(null)} />}
      {view?.mode === 'menu' && <BranchMenu branch={view.branch} onClose={() => setView(null)} />}

      {!view && (d.branches.length === 0 ? <div className="card p-8 text-center text-sm text-ink-500">No branches yet. Until you add and activate branches, customers order from your main restaurant page as usual.</div> : (
        <div className="grid gap-3 md:grid-cols-2">{d.branches.map((b) => (
          <div key={b._id} className="card space-y-2 p-5">
            <div className="flex items-start justify-between gap-2"><div><div className="font-bold">{b.name}</div><div className="text-xs text-ink-500">{b.address || 'No address yet'}</div>{b.phone && <div className="text-xs text-ink-500">{b.phone}</div>}</div><Badge color={b.status === 'active' ? 'green' : 'gray'}>{b.status === 'active' ? 'Active' : 'Inactive'}</Badge></div>
            <div className="flex flex-wrap gap-1.5 text-[11px] text-ink-500">{b.fulfillment?.deliveryEnabled && <span className="chip">Delivery</span>}{b.fulfillment?.pickupEnabled && <span className="chip">Pickup</span>}{b.fulfillment?.dineInEnabled && <span className="chip">Dine-in</span>}{b.openingHours?.length > 0 && <span className="chip">Own hours</span>}</div>
            <div className="flex flex-wrap gap-2 pt-1">
              {canManage && <button className="btn-ghost !py-1 !text-xs" onClick={() => setView({ mode: 'form', branch: b })}>Edit</button>}
              {access.can('menu') && <button className="btn-ghost !py-1 !text-xs" onClick={() => setView({ mode: 'menu', branch: b })}>Menu & prices</button>}
              {access.can('orders') && <Link className="btn-ghost !py-1 !text-xs" to={`/dashboard/orders?branch=${b._id}`}>Orders</Link>}
              {access.can('analytics') && <Link className="btn-ghost !py-1 !text-xs" to={`/dashboard/earnings?branch=${b._id}`}>Earnings</Link>}
              {canManage && <button className="btn-ghost !py-1 !text-xs" onClick={() => toggle(b)}>{b.status === 'active' ? 'Deactivate' : 'Activate'}</button>}
            </div>
          </div>))}</div>))}
    </div>
  );
}
