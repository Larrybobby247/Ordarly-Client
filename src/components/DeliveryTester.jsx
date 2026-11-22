import { useCallback, useState } from 'react';
import { api, naira } from '../lib/api';
import { feeFor } from '../lib/deliveryPricing';
import { Alert } from './ui';
import PlaceSearch from './PlaceSearch';

const OUTSIDE = 'This location is outside your delivery coverage. Customers at this location cannot currently order delivery from your restaurant.';
const MAX_HISTORY = 6;

/**
 * "Test your delivery charges". The server works out the real driving distance (same code path as customer checkout); nothing is saved.
 * After a test, the fee is re-worked locally from that road distance whenever the owner edits their prices, so they can experiment freely.
 *  - rules:    the numbers currently on screen (null while the form is incomplete)
 *  - origin:   { address, placeId } where placeId is set only for a restaurant address that has been picked but not saved yet
 */
export default function DeliveryTester({ rules, origin, disabled }) {
  const [res, setRes] = useState(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState([]); const [round, setRound] = useState(0);
  const search = useCallback((input, token) => api.post('/restaurant/places/autocomplete', { input, sessionToken: token, nearRestaurant: true }).then((r) => r.suggestions), []);

  const ready = !disabled && !!origin?.address && !!rules;
  const originKey = origin?.placeId || 'saved';

  const test = async (s, token) => {
    setErr(''); setRes(null);
    if (!s) return;
    setBusy(true);
    try {
      const r = await api.post('/restaurant/delivery-test', {
        placeId: s.placeId, sessionToken: token,
        ...(origin.placeId ? { restaurantPlaceId: origin.placeId } : {}),
        rules: { baseFee: rules.baseFee, baseDistanceKm: rules.baseDistanceKm, perKmRate: rules.perKmRate, maxRadiusKm: rules.maxRadiusKm },
      });
      setRes({ ...r, originKey, testedMax: rules.maxRadiusKm });
      setHistory((h) => [{ id: Date.now(), address: r.customerAddress, distanceKm: r.distanceKm, fee: r.fee, inCoverage: r.inCoverage }, ...h].slice(0, MAX_HISTORY));
    } catch (e) { setErr(e.message || 'We could not calculate that route. Please try again or pick a different address.'); }
    finally { setBusy(false); }
  };

  // Show what the CURRENT numbers would charge for the road distance we measured.
  let view = null;
  if (res && res.originKey === originKey && rules) {
    if (res.distanceKm != null) { const fee = feeFor(rules, res.distanceKm); view = { fee, inCoverage: fee != null }; }
    else if (rules.maxRadiusKm <= res.testedMax) view = { fee: null, inCoverage: false }; // already beyond even the straight line; only a bigger radius could change that
  }
  const stale = res && !view;

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-base font-bold">Test your delivery charges</h4>
        <p className="text-sm text-ink-500">Search for any customer address to see how far it is by road and what that customer would pay. Test as many addresses as you like: nothing is saved.</p>
      </div>

      {!ready && <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-ink-500">Choose your restaurant location and complete the prices above to start testing.</p>}

      <div className={ready ? '' : 'pointer-events-none opacity-50'}>
        <label className="label" htmlFor="test-address">Customer address</label>
        <PlaceSearch key={round} id="test-address" search={search} onPick={test} disabled={!ready} placeholder="Search a customer's street, estate or area…" />
      </div>

      {busy && <div role="status" className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-ink-500"><span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" aria-hidden="true" />Working out the driving distance…</div>}
      {err && <Alert kind="error">{err}</Alert>}
      {stale && !busy && <Alert kind="info">Your restaurant location or prices have changed. Search the customer address again to test it.</Alert>}

      {view && !busy && (
        <div className={`rounded-2xl border p-4 text-sm ${view.inCoverage ? 'border-brand-100 bg-brand-50' : 'border-red-100 bg-red-50'}`} role="status">
          <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-[9rem_1fr]">
            <dt className="text-ink-500">Restaurant</dt><dd className="font-medium">{res.restaurantAddress}</dd>
            <dt className="text-ink-500">Customer</dt><dd className="font-medium">{res.customerAddress}</dd>
            <dt className="text-ink-500">Road distance</dt>
            <dd className="font-medium">{res.distanceKm != null ? <>{res.distanceKm} km{res.durationMin ? <span className="font-normal text-ink-500"> · about {res.durationMin} min drive</span> : null}</> : <span className="text-ink-500">Further than {rules.maxRadiusKm} km</span>}</dd>
            <dt className="text-ink-500">Delivery fee</dt>
            <dd className="text-lg font-bold">{view.inCoverage ? naira(view.fee) : <span className="text-red-600">Not available</span>}</dd>
            <dt className="text-ink-500">Delivery coverage</dt>
            <dd className={`font-semibold ${view.inCoverage ? 'text-brand-700' : 'text-red-600'}`}>{view.inCoverage ? `✓ Within your ${rules.maxRadiusKm} km coverage` : '✗ Outside your coverage'}</dd>
          </dl>
          {!view.inCoverage && <p className="mt-3 font-semibold text-red-700">{OUTSIDE}</p>}
          <button type="button" className="btn-ghost mt-3 !px-4 !py-1.5 text-xs" onClick={() => { setRes(null); setErr(''); setRound((n) => n + 1); }}>Test another location</button>
        </div>
      )}

      {history.length > 1 && (
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">Recent tests</div>
          <ul className="divide-y divide-black/5 rounded-2xl border border-black/10 bg-white text-xs">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="min-w-0 truncate">{h.address}</span>
                <span className="shrink-0 text-right text-ink-500">{h.distanceKm != null ? `${h.distanceKm} km · ` : ''}<b className={h.inCoverage ? 'text-ink-900' : 'text-red-600'}>{h.inCoverage ? naira(h.fee) : 'Outside coverage'}</b></span>
              </li>))}
          </ul>
          <p className="mt-1 text-[11px] text-ink-500">Fees in this list use the prices you had when you tested.</p>
        </div>
      )}
    </div>
  );
}
