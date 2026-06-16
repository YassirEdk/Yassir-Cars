// ── Analytics helpers for the admin dashboard ────────────────────────────────
// All figures are derived from the reservation periods already loaded with each
// car (no extra DB calls). A rental's "status" walks reservee → en_cours →
// terminee; revenue/km are only counted once a rental is terminee (finished).
import { kmDone } from './format'

const DAY_MS = 86_400_000

// Number of days billed for a reservation (end − start, minimum 1 day).
export function rentalDays(r) {
  if (!r.start || !r.end) return 1
  const days = Math.round((new Date(r.end) - new Date(r.start)) / DAY_MS)
  return days > 0 ? days : 1
}

// Estimated revenue for one rental = car price/day × number of days.
export function rentalRevenue(car, r) {
  return (Number(car.price) || 0) * rentalDays(r)
}

// 'available' | 'rented' | 'damaged' — the car's live status right now.
export function carStatus(car) {
  if (car.damaged) return 'damaged'
  const periods = car.unavailable ?? []
  return periods.some(p => p.status === 'en_cours') ? 'rented' : 'available'
}

// Per-car aggregate figures used on both the list and the detail page.
export function carStats(car) {
  const periods = car.unavailable ?? []
  const upcoming  = periods.filter(p => (p.status ?? 'reservee') === 'reservee')
  const ongoing   = periods.filter(p => p.status === 'en_cours')
  const completed = periods.filter(p => p.status === 'terminee')
  const kmTotal   = completed.reduce((s, r) => s + (kmDone(r) ?? 0), 0)
  const revenue   = completed.reduce((s, r) => s + rentalRevenue(car, r), 0)
  return {
    status: carStatus(car),
    upcoming: upcoming.length,
    ongoing: ongoing.length,
    completed: completed.length,
    rentalsTotal: completed.length + ongoing.length,
    kmTotal,
    revenue,
  }
}

// Fleet-wide status counts → drives the donut chart.
export function fleetStatus(cars) {
  const out = { available: 0, rented: 0, damaged: 0 }
  for (const c of cars) out[carStatus(c)]++
  return out
}

// Fleet totals for the summary stat cards.
export function fleetTotals(cars) {
  let revenue = 0, km = 0, completed = 0, upcoming = 0, ongoing = 0
  for (const c of cars) {
    const s = carStats(c)
    revenue += s.revenue; km += s.kmTotal
    completed += s.completed; upcoming += s.upcoming; ongoing += s.ongoing
  }
  const models = new Set(cars.map(c => c.name.trim().toLowerCase())).size
  return { revenue, km, completed, upcoming, ongoing, models, units: cars.length }
}

// Human month label from a YYYY-MM key → "janv. 2026".
function monthLabel(key) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
}

// Monthly revenue + rental count across the given cars (one car or the whole
// fleet). A finished rental is attributed to the month of its end date.
// `months` back-fills empty months so the line chart has no gaps.
export function monthlySeries(cars, months = 8) {
  const map = new Map()
  for (const car of cars) {
    for (const r of car.unavailable ?? []) {
      if (r.status !== 'terminee') continue
      const key = (r.end || r.start || '').slice(0, 7)
      if (!key) continue
      if (!map.has(key)) map.set(key, { revenue: 0, rentals: 0 })
      const bucket = map.get(key)
      bucket.revenue += rentalRevenue(car, r)
      bucket.rentals += 1
    }
  }
  // Build a continuous run of the last `months` keys ending this month.
  const keys = []
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  // Include any older months that actually have data but fall outside the window.
  for (const k of map.keys()) if (!keys.includes(k)) keys.unshift(k)
  keys.sort()
  return keys.map(k => ({
    month: k,
    label: monthLabel(k),
    revenue: map.get(k)?.revenue ?? 0,
    rentals: map.get(k)?.rentals ?? 0,
  }))
}

// Cars ranked by a numeric stat (rentals or km), highest first, top `limit`.
// Used by the "Rentals per car" and "Km per car" bar charts.
export function ranking(cars, pick, limit = 8) {
  return cars
    .map(c => ({ id: c.id, name: c.name, immatriculation: c.immatriculation, value: pick(carStats(c)) }))
    .filter(r => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

// Most common currency across the fleet (for labelling money figures).
export function fleetCurrency(cars) {
  const counts = {}
  for (const c of cars) { const cur = c.currency || 'MAD'; counts[cur] = (counts[cur] || 0) + 1 }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'MAD'
}
