// Delivery pricing used for the dashboard's live preview ("How your delivery pricing works") and for re-pricing a tested address
// while the owner edits the numbers. It is the SAME formula the server uses (server/src/services/delivery.js calcFee). The server always
// recalculates real quotes and orders, so this file never decides what a customer actually pays.

export const DELIVERY_DEFAULTS = { baseFee: 1000, baseDistanceKm: 3, perKmRate: 200, maxRadiusKm: 15 };

/**
 * extraDistance = Math.max(0, distanceKm - baseDistance)
 * deliveryFee   = baseFee + Math.ceil(extraDistance) * additionalFeePerKm      (only within the maximum delivery radius)
 * Returns the fee, or null when the distance is beyond the radius.
 */
export function feeFor(rules, distanceKm) {
  if (!(distanceKm <= rules.maxRadiusKm)) return null;
  const extraDistance = Math.max(0, distanceKm - rules.baseDistanceKm);
  return rules.baseFee + Math.ceil(extraDistance - 1e-9) * rules.perKmRate; // 1e-9: ignore floating-point noise only
}

const STEPS = [1, 2, 3, 4, 5, 7, 10, 15, 20, 25, 30, 40, 50, 75, 100];

/** Distances shown in the pricing table: the usual steps up to the radius, plus the base distance and the radius itself. With the defaults: 1, 2, 3, 4, 5, 7, 10, 15 km. */
export function tableDistances(rules) {
  const set = new Set(STEPS.filter((k) => k <= rules.maxRadiusKm));
  set.add(rules.baseDistanceKm); set.add(rules.maxRadiusKm);
  return [...set].filter((k) => k > 0).sort((a, b) => a - b);
}

/** Turns the form's text fields into numbers, or null while any of them is empty or out of range. */
export function readRules(v) {
  if ([v.baseFee, v.perKmRate, v.maxRadiusKm, v.baseDistanceKm].some((x) => x === '' || x == null)) return null;
  const r = { baseFee: Number(v.baseFee), baseDistanceKm: Number(v.baseDistanceKm), perKmRate: Number(v.perKmRate), maxRadiusKm: Number(v.maxRadiusKm) };
  if (Object.values(r).some((x) => !Number.isFinite(x) || x < 0)) return null;
  if (r.baseDistanceKm < 0.5 || r.maxRadiusKm < 1 || r.maxRadiusKm < r.baseDistanceKm) return null;
  return r;
}
