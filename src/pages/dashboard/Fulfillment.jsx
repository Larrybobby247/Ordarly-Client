import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useDash } from '../../components/DashboardLayout';
import { Alert, Spinner, Field } from '../../components/ui';
import PlaceSearch from '../../components/PlaceSearch';
import DeliveryPricingIllustration from '../../components/DeliveryPricingIllustration';
import DeliveryTester from '../../components/DeliveryTester';
import { readRules } from '../../lib/deliveryPricing';

function Toggle({ checked, onChange, label, desc, disabled }) {
  return (
    <label className={`flex items-start gap-3 text-sm ${disabled ? 'opacity-60' : ''}`}>
      <input type="checkbox" className="mt-1" disabled={disabled} checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span><b>{label}</b><span className="block text-xs text-ink-500">{desc}</span></span>
    </label>
  );
}

const TERMS = [
  ['baseFee', 'Base delivery fee (₦)', 'The minimum delivery amount customers pay.', 50],
  ['perKmRate', 'Additional fee per kilometre (₦)', "The extra amount added as the customer's delivery distance increases.", 50],
  ['maxRadiusKm', 'Maximum delivery radius (km)', 'The furthest distance you are willing to deliver.', 1],
];

const toFields = (r) => ({ baseFee: String(r.baseFee), baseDistanceKm: String(r.baseDistanceKm), perKmRate: String(r.perKmRate), maxRadiusKm: String(r.maxRadiusKm) });

export default function Fulfillment() {
  const { data, reload } = useDash();
  const [d, setD] = useState(null); const [info, setInfo] = useState(null); const [v, setV] = useState(null);
  const [loc, setLoc] = useState(null); const [placeSession, setPlaceSession] = useState('');
  const [msg, setMsg] = useState(null); const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/restaurant/fulfillment').then((r) => {
      const f = r.fulfillment; setInfo(r); setD(f);
      setV(toFields(r.rules)); // saved values, or the Ordarly defaults for a restaurant that has not set its own yet
      setLoc(f.location?.lat != null ? { address: f.location.address, saved: true } : null);
    });
  }, []);

  if (!d || !info || !v) return <Spinner />;

  const rules = readRules(v); // null until every number is filled in and sensible
  const valid = !!rules && !!loc;
  const usingDefaults = !!info.rules?.isDefault && Object.keys(v).every((k) => String(info.defaults[k]) === v[k]);
  const search = (input, token) => api.post('/restaurant/places/autocomplete', { input, sessionToken: token }).then((r) => r.suggestions);
  const set = (k, x) => setV((p) => ({ ...p, [k]: x }));
  const canEnable = !!loc;

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      let on = d.deliveryEnabled && canEnable;
      if (valid) {
        const r = await api.put('/restaurant/delivery-radius', { ...rules, placeId: loc?.placeId, sessionToken: placeSession || undefined });
        setLoc((l) => ({ address: l.address, saved: true })); setInfo((i) => ({ ...i, deliveryReady: true, rules: r.rules }));
      } else if (!rules) { setMsg({ kind: 'error', text: 'Please fill in all the delivery prices (the maximum radius must be at least as far as the base distance) before saving.' }); setBusy(false); return; }
      else on = false; // delivery cannot be on without a location
      await api.put('/restaurant/fulfillment', { ...d, deliveryEnabled: on });
      setD({ ...d, deliveryEnabled: on }); await reload();
      setMsg({ kind: 'ok', text: !valid ? 'Saved. Delivery stays off until you choose your restaurant location.' : on ? 'Saved. Customers who choose delivery will now be priced with these settings.' : 'Saved. Your delivery settings are ready. Switch on "Offer home delivery" and save when you want customers to see it.' });
    } catch (e) { setMsg({ kind: 'error', text: e.message }); } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="card space-y-6 p-6">
        <div>
          <h3 className="text-lg font-bold">🚚 Delivery</h3>
          <p className="text-sm text-ink-500">Pick your restaurant's location and you're ready to go. We fill in sensible delivery prices for you, and you can change them any time.</p>
        </div>

        {!info.mapsConfigured && <Alert kind="info">Address search and distance calculation are not switched on for this platform yet, so delivery can't be set up. (Admin: add <code>GOOGLE_PLACES_API_KEY</code> and <code>LOCATIONIQ_API_KEY</code> to the server settings.)</Alert>}

        {/* 1. Restaurant Location */}
        <section aria-labelledby="sec-loc" className="space-y-2">
          <h4 id="sec-loc" className="text-base font-bold">1. Restaurant location</h4>
          <label className="label" htmlFor="loc">Where is your restaurant?</label>
          <PlaceSearch id="loc" search={search} initial={loc?.address || ''} placeholder="Start typing your restaurant's address…" disabled={!info.mapsConfigured}
            onPick={(s, token) => { if (s) { setLoc({ placeId: s.placeId, address: s.text || `${s.main}, ${s.secondary}` }); setPlaceSession(token); } else setLoc(null); }} />
          {loc ? (
            <div className="flex items-start justify-between gap-3 rounded-2xl border border-brand-100 bg-brand-50 p-3 text-sm">
              <div><div className="text-xs font-semibold uppercase tracking-wide text-brand-700">{loc.saved ? 'Your restaurant location' : 'Selected location (not saved yet)'}</div><div className="font-medium">📍 {loc.address}</div></div>
            </div>) : <p className="text-xs text-ink-500">Delivery distances are measured from this point. Pick your address from the suggestions.</p>}
          {loc && <p className="text-xs text-ink-500">{loc.saved ? 'To change it, search for a new address above.' : 'Press "Save changes" at the bottom to keep this location.'}</p>}
        </section>

        {/* 2. Delivery Pricing */}
        <section aria-labelledby="sec-price" className="space-y-3">
          <div>
            <h4 id="sec-price" className="text-base font-bold">2. Delivery pricing</h4>
            <p className="text-xs text-ink-500">{usingDefaults ? "We've filled these in with our recommended starting prices. Keep them, or change them to suit your dispatch costs." : 'Change these any time to suit your dispatch costs and delivery policy.'}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {TERMS.map(([k, label, help, step]) => (
              <div key={k} className="rounded-2xl border border-black/10 p-3">
                <label className="label" htmlFor={k}>{label}</label>
                <input id={k} className="input" type="number" min="0" step={step} inputMode="decimal" value={v[k]} onChange={(e) => set(k, e.target.value)} />
                <p className="mt-1.5 text-xs text-ink-500">{help}</p>
              </div>))}
          </div>
          <details className="rounded-2xl border border-black/10 p-3 text-sm">
            <summary className="cursor-pointer font-semibold">Advanced settings</summary>
            <div className="mt-3 max-w-xs">
              <label className="label" htmlFor="baseDistanceKm">Distance covered by the base fee (km)</label>
              <input id="baseDistanceKm" className="input" type="number" min="0.5" step="0.5" inputMode="decimal" value={v.baseDistanceKm} onChange={(e) => set('baseDistanceKm', e.target.value)} />
              <p className="mt-1.5 text-xs text-ink-500">Customers within this distance pay only the base fee. Most restaurants leave this at {info.defaults.baseDistanceKm} km.</p>
            </div>
          </details>
          {!rules && <p className="text-xs text-red-600">{Number(v.maxRadiusKm) < Number(v.baseDistanceKm) && v.maxRadiusKm !== '' ? 'The maximum delivery radius must be at least as far as the base distance.' : 'Please fill in every price. Use 0 if you want an amount to be free.'}</p>}
          <Toggle checked={d.deliveryEnabled && canEnable} disabled={!canEnable} onChange={(x) => setD({ ...d, deliveryEnabled: x })} label="Offer home delivery"
            desc={canEnable ? 'Customers will see delivery at checkout and pay the fee shown below.' : 'Choose your restaurant location first. Until then delivery is hidden from customers.'} />
        </section>

        {/* 3. How Your Delivery Pricing Works */}
        <section aria-label="How your delivery pricing works"><DeliveryPricingIllustration rules={rules} /></section>

        {/* 4. Test Your Delivery Charges */}
        <section aria-label="Test your delivery charges">
          <DeliveryTester rules={rules} disabled={!info.mapsConfigured} origin={loc ? { address: loc.address, placeId: loc.saved ? undefined : loc.placeId } : null} />
        </section>
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

      <div className="space-y-3">
        {msg && <div role="status"><Alert kind={msg.kind}>{msg.text}</Alert></div>}
        <button className="btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save changes'}</button>
      </div>
      <SchedulingCard />
    </div>
  );
}

/* ---------------- Order for later ---------------- */
const NOTICE = [[0, 'No notice'], [30, '30 minutes'], [60, '1 hour'], [120, '2 hours'], [240, '4 hours'], [720, '12 hours'], [1440, '1 day'], [2880, '2 days']];
function SchedulingCard() {
  const [f, setF] = useState(null); const [msg, setMsg] = useState(null); const [busy, setBusy] = useState(false);
  useEffect(() => { api.get('/restaurant/scheduling').then((d) => setF(d.scheduling)).catch(() => setMsg({ kind: 'error', text: 'Could not load scheduling settings.' })); }, []);
  if (!f) return null;
  const set = (p) => setF((x) => ({ ...x, ...p }));
  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await api.put('/restaurant/scheduling', { enabled: f.enabled, maxDaysAhead: Number(f.maxDaysAhead), minNoticeMinutes: Number(f.minNoticeMinutes), slotMinutes: Number(f.slotMinutes), capacityPerSlot: Number(f.capacityPerSlot), reminderMinutes: Number(f.reminderMinutes), timezone: f.timezone });
      setF(r.scheduling); setMsg({ kind: 'ok', text: 'Saved. Customers can now schedule orders within these limits.' });
    } catch (e) { setMsg({ kind: 'error', text: e.message }); } finally { setBusy(false); }
  };
  return (
    <div className="card space-y-4 p-6">
      <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">Order for later (scheduled orders)</h3><p className="text-sm text-ink-500">Let customers pick a future date and time instead of ordering for right now. Times follow your opening hours (or each branch's own hours).</p></div>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-5 w-5" checked={f.enabled} onChange={(e) => set({ enabled: e.target.checked })} />On</label></div>
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      {f.enabled && <div className="grid gap-4 sm:grid-cols-2">
        <Field label="How far ahead can customers book?"><select className="input" value={f.maxDaysAhead} onChange={(e) => set({ maxDaysAhead: e.target.value })}>{[1, 2, 3, 5, 7, 14, 30].map((n) => <option key={n} value={n}>{n} day{n > 1 && 's'}</option>)}</select></Field>
        <Field label="Minimum notice"><select className="input" value={f.minNoticeMinutes} onChange={(e) => set({ minNoticeMinutes: e.target.value })}>{NOTICE.map(([m, l]) => <option key={m} value={m}>{l}</option>)}</select></Field>
        <Field label="Time slot length"><select className="input" value={f.slotMinutes} onChange={(e) => set({ slotMinutes: e.target.value })}>{[15, 30, 45, 60, 120].map((n) => <option key={n} value={n}>{n} minutes</option>)}</select></Field>
        <Field label="Orders per time slot" hint="0 means no limit. Full slots can't be booked."><input type="number" min="0" max="500" className="input" value={f.capacityPerSlot} onChange={(e) => set({ capacityPerSlot: e.target.value })} /></Field>
        <Field label="Remind me before an order is due"><select className="input" value={f.reminderMinutes} onChange={(e) => set({ reminderMinutes: e.target.value })}>{[15, 30, 60, 90, 120, 180].map((n) => <option key={n} value={n}>{n} minutes before</option>)}</select></Field>
        <Field label="Time zone" hint="All scheduled times use this zone."><input className="input" value={f.timezone} onChange={(e) => set({ timezone: e.target.value })} /></Field>
      </div>}
      <button className="btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save scheduling settings'}</button>
    </div>
  );
}
