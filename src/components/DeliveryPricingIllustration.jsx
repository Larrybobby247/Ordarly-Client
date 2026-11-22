import { naira } from '../lib/api';
import { feeFor, tableDistances } from '../lib/deliveryPricing';

const km = (n) => `${Number(n).toLocaleString('en-NG', { maximumFractionDigits: 1 })} km`;

// "How your delivery pricing works": plain-language rules + a table, redrawn instantly from whatever numbers are on screen.
export default function DeliveryPricingIllustration({ rules }) {
  if (!rules) {
    return (
      <div className="rounded-2xl bg-mint-50 p-4 text-sm">
        <h4 className="font-bold">How your delivery pricing works</h4>
        <p className="mt-1 text-xs text-ink-500">Fill in all the prices above (and make sure the maximum radius is at least as far as the base distance) to see how your pricing works.</p>
      </div>
    );
  }
  const rows = tableDistances(rules);
  return (
    <div className="rounded-2xl bg-mint-50 p-4 text-sm">
      <h4 className="font-bold">How your delivery pricing works</h4>
      <ul className="mt-2 space-y-1.5 text-sm">
        <li className="flex gap-2"><span aria-hidden="true">📍</span><span>Customers within the first <b>{km(rules.baseDistanceKm)}</b> pay the base delivery fee of <b>{naira(rules.baseFee)}</b>.</span></li>
        <li className="flex gap-2"><span aria-hidden="true">➕</span><span>Every additional kilometre beyond the first {km(rules.baseDistanceKm)} adds <b>{naira(rules.perKmRate)}</b>. A part of a kilometre counts as a full one.</span></li>
        <li className="flex gap-2"><span aria-hidden="true">🚫</span><span>Customers further than <b>{km(rules.maxRadiusKm)}</b> cannot place delivery orders from your restaurant.</span></li>
      </ul>

      <div className="mt-3 overflow-hidden rounded-xl border border-black/10 bg-white">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Delivery fee by customer distance</caption>
          <thead className="bg-brand-50 text-xs uppercase tracking-wide text-ink-500">
            <tr><th scope="col" className="px-3 py-2 font-semibold">Customer distance</th><th scope="col" className="px-3 py-2 text-right font-semibold">Delivery fee</th></tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {rows.map((d) => (
              <tr key={d}>
                <td className="px-3 py-1.5">{km(d)}{d === rules.baseDistanceKm && <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700">base fee ends here</span>}</td>
                <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{naira(feeFor(rules, d))}</td>
              </tr>))}
            <tr className="bg-slate-50 text-ink-500"><td className="px-3 py-1.5">More than {km(rules.maxRadiusKm)}</td><td className="px-3 py-1.5 text-right">Delivery not available</td></tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-ink-500">Distance is measured by road, from your restaurant to the customer. This table updates as you change your prices.</p>
    </div>
  );
}
