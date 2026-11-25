/* Filters and sort of the results page. They live in the URL, so the back
   button, a reload and a shared link all keep them. */
import { categoryKey, carCategories } from '../data'
import { isCarAvailable } from './cars'
import { discounted, rateForCar } from './pricing'

export const SORT_OPTIONS = [
  { value: 'prix-asc',  label: 'Prix croissant' },
  { value: 'prix-desc', label: 'Prix décroissant' },
  { value: 'nom',       label: 'Nom, de A à Z' },
]

const slug = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

const gearbox = (unit) => (slug(unit.transmission).startsWith('auto') ? 'auto' : 'manuel')
const GEARBOX_LABELS = { auto: 'Automatique', manuel: 'Manuelle' }

const seatGroup = (unit) => (Number(unit.seats) >= 7 ? '7' : '5')
const SEAT_LABELS = { 5: '5 places', 7: '7 places et +' }

export const unitPrice = (unit, settings) => discounted(unit.price, rateForCar(unit.id, settings))

// ── URL ⇄ filters ──────────────────────────────────────────────────────────
const KEYS = ['categorie', 'boite', 'places', 'carburant', 'prix', 'dispo', 'tri']

export function readFilters(params) {
  const oneOf = (key, allowed) => (allowed.includes(params.get(key)) ? params.get(key) : '')
  return {
    categorie: categoryKey(params.get('categorie')),
    boite: oneOf('boite', Object.keys(GEARBOX_LABELS)),
    places: oneOf('places', Object.keys(SEAT_LABELS)),
    carburant: slug(params.get('carburant')),
    prix: Math.max(0, Number(params.get('prix')) || 0),        // 0 = no limit
    dispo: params.get('dispo') === '1',
    tri: oneOf('tri', SORT_OPTIONS.map(o => o.value)) || 'prix-asc',
  }
}

// Copies `params`, with the filters rewritten. Defaults are left out of the URL.
export function writeFilters(params, filters) {
  const next = new URLSearchParams(params)
  for (const key of KEYS) {
    const v = filters[key]
    if (!v || (key === 'tri' && v === 'prix-asc')) next.delete(key)
    else next.set(key, v === true ? '1' : String(v))
  }
  return next
}

// What the "Filtres" badge counts: the category has its own pills, sorting isn't a filter.
export const activeFilterCount = (f, query = '') =>
  [f.boite, f.places, f.carburant, f.prix, f.dispo, query.trim()].filter(Boolean).length

export const NO_FILTERS = { categorie: '', boite: '', places: '', carburant: '', prix: 0, dispo: false }

// ── The fleet, as these filters see it ─────────────────────────────────────

// Choices worth offering: a group with a single value would filter nothing.
export function filterChoices(models, settings) {
  const units = models.flatMap(m => m.units)
  const group = (keyOf, labelOf) => {
    const map = new Map()
    for (const u of units) if (!map.has(keyOf(u))) map.set(keyOf(u), labelOf(u))
    return map.size > 1
      ? [...map].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, 'fr'))
      : []
  }
  const prices = units.map(u => unitPrice(u, settings))
  return {
    boite: group(gearbox, u => GEARBOX_LABELS[gearbox(u)]),
    places: group(seatGroup, u => SEAT_LABELS[seatGroup(u)]),
    carburant: group(u => slug(u.fuel), u => u.fuel),
    priceMin: prices.length ? Math.ceil(Math.min(...prices) / 50) * 50 : 0,
    priceMax: prices.length ? Math.ceil(Math.max(...prices) / 50) * 50 : 0,
  }
}

/* A model is a group of physical cars, and two cars of one model can differ (one
   Opel Corsa is automatic, the other manual). So filters apply to the cars: a
   model stays if any of its cars matches, and shows only those.

   `shownPrice` is the price printed on the card, and what the sort uses. It used
   to be the model's cheapest car while the card showed another one, which is how
   "Prix croissant" went 350, 250, 300. */
export function narrowModels(models, { filters, query = '', depart, retour, settings }) {
  const q = slug(query)
  return models.flatMap(model => {
    if (q && !slug(model.name).includes(q)) return []
    const free = (u) => isCarAvailable(u, depart, retour)
    const units = model.units.filter(u =>
      (!filters.boite || gearbox(u) === filters.boite) &&
      (!filters.places || seatGroup(u) === filters.places) &&
      (!filters.carburant || slug(u.fuel) === filters.carburant) &&
      (!filters.prix || unitPrice(u, settings) <= filters.prix) &&
      (!filters.dispo || free(u)))
    if (!units.length) return []
    const shown = units.find(free) ?? units[0]
    return [{
      ...model,
      units,
      colors: [...new Set(units.map(u => u.color).filter(Boolean))],
      categories: [...new Set(units.flatMap(carCategories))],
      freeUnits: units.filter(free).length,
      available: units.some(free),
      shownColor: shown.color ?? null,
      shownPrice: unitPrice(shown, settings),
    }]
  })
}

// Pills and their counts, from the very list they filter. Empty ones are dropped.
export function categoryCounts(models) {
  const counts = {}
  for (const m of models) for (const c of m.categories) counts[c] = (counts[c] || 0) + 1
  return counts
}

export function sortModels(models, tri) {
  const list = [...models]
  if (tri === 'prix-asc')  list.sort((a, b) => a.shownPrice - b.shownPrice)
  if (tri === 'prix-desc') list.sort((a, b) => b.shownPrice - a.shownPrice)
  if (tri === 'nom')       list.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  // Cars that can be booked always come first.
  return list.sort((a, b) => Number(b.available) - Number(a.available))
}
