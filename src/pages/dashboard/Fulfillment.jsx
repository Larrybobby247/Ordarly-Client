import { useEffect, useState } from 'react';
import { api, naira } from '../../lib/api';
import { useDash } from '../../components/DashboardLayout';
import { Alert, ProLock, Spinner } from '../../components/ui';
import PlaceSearch from '../../components/PlaceSearch';

function Toggle({ checked, onChange, label, desc, disabled }) {
  return (
    <label className={`flex items-start gap-3 text-sm ${disabled ? 'opacity-60' : ''}`}>
      <input type="checkbox" className="mt-1" disabled={disabled} checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span><b>{label}</b><span className="block text-xs text-ink-500">{desc}</span></span>
    </label>
  );
}

// Same formula the server uses (rounded UP to the next ₦100). This is only a preview; the server prices real orders.
const feeFor = (v, km) => (km > v.maxRadiusKm ? null : Math.ceil((km <= v.baseDistanceKm ? v.baseFee : v.baseFee + (km - v.baseDistanceKm) * v.perKmRate) / 100 - 1e-9) * 100);

const TERMS = [
  ['baseFee', 'Base fee (₦)', 'The starting price of every delivery. It covers the first stretch of distance, set by the base distance.', '1000', 50],
  ['baseDistanceKm', 'Base distance (km)', 'How far the base fee reaches. A customer inside this distance pays only the base fee.', '3', 0.5],
  ['perKmRate', 'Price per extra km (₦)', 'Added for every kilometre beyond the base distance.', '300', 50],
  ['maxRadiusKm', 'Maximum radius (km)', 'The furthest you will deliver. Addresses beyond it cannot order delivery.', '12', 1],
];

export default function Fulfillment() {
  const { data, reload } = useDash();
  const [d, setD] = useState(null); const [info, setInfo] = useState(null); const [v, setV] = useState(null);
  const [loc, setLoc] = useState(null); const [placeSession, setPlaceSession] = useState(''); const [km, setKm] = useState(6);
  const [msg, setMsg] = useState(null); const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/restaurant/fulfillment').then((r) => {
      const f = r.fulfillment; setInfo(r); setD(f);
      setV(f.radius?.configured
        ? { baseFee: String(f.radius.baseFee), baseDistanceKm: String(f.radius.baseDistanceKm), perKmRate: String(f.radius.perKmRate), maxRadiusKm: String(f.radius.maxRadiusKm) }
        : { baseFee: '', baseDistanceKm: '', perKmRate: '', maxRadiusKm: '' });
      setLoc(f.location?.lat != null ? { address: f.location.address, saved: true } : null);
    });
  }, []);

  if (!data.isPro) return <ProLock title="Delivery, pickup and dine-in">Free restaurants arrange pickup directly with customers over WhatsApp.</ProLock>;
  if (!d || !info || !v) return <Spinner />;

  const num = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, Number(x)]));
  const valid = v.baseFee !== '' && v.perKmRate !== '' && num.baseDistanceKm >= 0.5 && num.maxRadiusKm >= num.baseDistanceKm && !!loc;
  const preview = valid ? feeFor(num, km) : null;
  const ready = info.deliveryReady && !loc?.placeId; // saved earlier and not being changed
  const search = (input, token) => api.post('/restaurant/places/autocomplete', { input, sessionToken: token }).then((r) => r.suggestions);

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      let on = d.deliveryEnabled;
      if (valid) {
        await api.put('/restaurant/delivery-radius', { ...num, placeId: loc?.placeId, sessionToken: placeSession || undefined });
        setLoc((l) => ({ address: l.address, saved: true })); setInfo((i) => ({ ...i, deliveryReady: true }));
      } else on = false; // delivery cannot be on without a finished setup
      await api.put('/restaurant/fulfillment', { ...d, deliveryEnabled: on });
      setD({ ...d, deliveryEnabled: on }); await reload();
      setMsg({ kind: 'ok', text: valid ? 'Saved. Customers who pick delivery will now be priced by distance.' : 'Saved. Delivery stays hidden from customers until the radius rate is complete.' });
    } catch (e) { setMsg({ kind: 'error', text: e.message }); } finally { setBusy(false); }
  };
  const canEnable = valid || info.deliveryReady;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}

      <div className="card space-y-5 p-6">
        <div>
          <h3 className="text-lg font-bold">🚚 Delivery by distance (radius rate)</h3>
          <p className="text-sm text-ink-500">Your delivery fee is worked out automatically from how far the customer is from your restaurant. Fill in the four numbers below and customers will see their price at checkout. <b>Until this is complete, customers can't choose delivery.</b></p>
        </div>

        {!info.mapsConfigured && <Alert kind="info">Address search is not switched on for this platform yet, so delivery can't be set up. (Admin: add <code>GOOGLE_MAPS_API_KEY</code> to the server settings.)</Alert>}

        <div>
          <label className="label" htmlFor="loc">1. Where is your restaurant?</label>
          <PlaceSearch id="loc" search={search} initial={loc?.address || ''} placeholder="Search your restaurant's street address…" disabled={!info.mapsConfigured}
            onPick={(s, token) => { if (s) { setLoc({ placeId: s.placeId, address: s.text || `${s.main}, ${s.secondary}` }); setPlaceSession(token); } else setLoc(null); }} />
          <p className="mt-1 text-xs text-ink-500">{loc?.saved ? '✓ Location saved. Search again to change it.' : loc ? '✓ Address picked. Save to keep it.' : 'Distances are measured from this point. Pick the address from the list.'}</p>
        </div>

        <div>
          <div className="label">2. Set your prices</div>
          <div className="grid gap-4 sm:grid-cols-2">
            {TERMS.map(([k, label, help, ph, step]) => (
              <div key={k} className="rounded-2xl border border-black/10 p-3">
                <label className="label" htmlFor={k}>{label}</label>
                <input id={k} className="input" type="number" min="0" step={step} inputMode="decimal" placeholder={`e.g. ${ph}`} value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
                <p className="mt-1.5 text-xs text-ink-500">{help}</p>
              </div>))}
          </div>
          {v.maxRadiusKm !== '' && num.maxRadiusKm < num.baseDistanceKm && <p className="mt-2 text-xs text-red-600">The maximum radius can't be smaller than the base distance.</p>}
        </div>

        <div className="rounded-2xl bg-mint-50 p-4 text-sm">
          <div className="font-semibold">How a customer's price is worked out</div>
          <p className="mt-1 text-xs text-ink-500">Fee = base fee, plus (distance − base distance) × price per extra km. The result is rounded up to the next ₦100. Distance is the straight-line distance on the map.</p>
          {valid ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span>Try it: a customer</span>
              <input aria-label="Distance in km" className="input !w-20 !py-1.5" type="number" min="0" step="0.5" value={km} onChange={(e) => setKm(Math.max(0, Number(e.target.value)))} />
              <span>km away pays</span><b className="text-brand-700">{preview == null ? 'nothing: too far to deliver' : naira(preview)}</b>
            </div>) : <p className="mt-2 text-xs text-ink-500">Complete steps 1 and 2 to see an example.</p>}
          {valid && num.baseDistanceKm > 0 && <p className="mt-2 text-xs text-ink-500">Example: {naira(num.baseFee)} for the first {num.baseDistanceKm} km, then {naira(num.perKmRate)} for every extra km, up to {num.maxRadiusKm} km.</p>}
        </div>

        <Toggle checked={d.deliveryEnabled && canEnable} disabled={!canEnable} onChange={(x) => setD({ ...d, deliveryEnabled: x })} label="3. Offer home delivery"
          desc={canEnable ? 'Customers will see delivery at checkout.' : 'Finish steps 1 and 2 first. Until then delivery is hidden from customers.'} />
        {ready && !d.deliveryEnabled && <p className="text-xs text-ink-500">Your radius rate is saved. Tick the box and save to start offering delivery.</p>}
      </div>

      <div className="card space-y-4 p-6">
        <h3 className="font-bold">Pickup</h3>
        <Toggle checked={d.pickupEnabled} onChange={(x) => setD({ ...d, pickupEnabled: x })} label="Customer pickup" desc="No delivery fee. Your address is shown to the customer." />
        <textarea className="input" rows={2} placeholder="Collection instructions (optional)" value={d.pickupInstructions || ''} onChange={(e) => setD({ ...d, pickupInstructions: e.target.value })} />
      </div>

      <div className="card space-y-4 p-6">
        <h3 className="font-bold">Dine-in</h3>
        <Toggle checked={d.dineInEnabled} onChange={(x) => setD({ ...d, dineInEnabled: x })} label="Eat at the restaurant" desc="Customers order ahead for dining on site. No delivery fee." />
        <Toggle checked={d.askTableNumber} onChange={(x) => setD({ ...d, askTableNumber: x })} label="Ask for a table number" desc="Optional seating reference." />
      </div>

      <button className="btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save fulfilment settings'}</button>
    </div>
  );
}
