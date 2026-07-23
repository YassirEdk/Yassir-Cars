/* ── Promotional pricing ──────────────────────────────────────────────────────
   The "-30%" used to be a literal `Math.round(price * 0.7)` in five components,
   with the badge text hardcoded beside each one. They could drift apart, and the
   discount could never be turned off. Everything now derives from
   `settings.discountRate` (a whole percentage, 0 = no promotion).             */

// Clamp whatever came out of the DB into a usable 0–99 percentage.
export function normalizeRate(rate) {
  const n = Number(rate)
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.min(99, Math.round(n))
}

// Discounted price, or the untouched price when no promotion is running.
export function discounted(price, rate) {
  const r = normalizeRate(rate)
  const p = Number(price) || 0
  return r ? Math.round(p * (1 - r / 100)) : p
}

// Badge text ("-30%"), or null when there is nothing to advertise. Callers use
// the null to drop the badge and the struck-through original price entirely.
export function discountLabel(rate) {
  const r = normalizeRate(rate)
  return r ? `-${r}%` : null
}

/* The rate that applies to ONE car. The promotion has three gates — the master
   switch, a non-zero rate, and the scope — and any of them can shut it off, so
   every price on the site goes through this single function.

   `carId` is a physical car (unit) id, matching what the admin picker lists. */
export function rateForCar(carId, settings) {
  if (!settings?.discountActive) return 0
  const rate = normalizeRate(settings.discountRate)
  if (!rate) return 0
  if (settings.discountAllCars) return rate
  const ids = settings.discountCarIds ?? []
  return ids.includes(String(carId)) ? rate : 0
}

// True when the promotion could show up anywhere at all — used by the banner,
// which must never advertise an offer no car actually has.
export function promotionRuns(settings) {
  if (!settings?.discountActive) return false
  if (!normalizeRate(settings.discountRate)) return false
  return settings.discountAllCars || (settings.discountCarIds ?? []).length > 0
}
