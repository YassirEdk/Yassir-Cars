import { supabase, isSupabaseConfigured } from './supabase'
import { cars as staticCars, parseFeatures } from '../data'

// DB rows use snake_case; the React components expect camelCase
// (brandLogo, whiteFilter, badgeColor). Normalize here so nothing else changes.
function fromRow(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    // Always expose an array (falls back to the single main category) so the
    // admin checkboxes and carInCategory both have a consistent shape.
    categories: row.categories ?? [row.category],
    photo: row.photo,
    // Gallery: full list of photos (falls back to the single cover photo).
    photos: row.photos?.length ? row.photos : (row.photo ? [row.photo] : []),
    brandLogo: row.brand_logo,
    brandColor: row.brand_color,
    whiteFilter: row.white_filter,
    price: row.price,
    currency: row.currency,
    fuel: row.fuel,
    transmission: row.transmission,
    seats: row.seats,
    features: parseFeatures(row.features),
    badge: row.badge,
    badgeColor: row.badge_color,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    color: row.color,
    immatriculation: row.immatriculation,
    damaged: row.damaged ?? false,
    lastKm: row.last_km ?? null,
    // Reservations that block this car (date range + client details).
    // `status` walks through reservee → en_cours → terminee (see migration-rentals.sql).
    unavailable: (row.unavailable_periods ?? []).map(p => ({
      id: p.id,
      start: p.start_date,
      end: p.end_date,
      note: p.note,
      clientName: p.client_name,
      cin: p.cin,
      tel: p.tel,
      matriculation: p.matriculation,
      licenceNumber: p.licence_number ?? null,
      secondDriverName: p.second_driver_name ?? null,
      secondDriverCin: p.second_driver_cin ?? null,
      secondDriverLicence: p.second_driver_licence ?? null,
      status: p.status ?? 'reservee',
      departureKm: p.departure_km,
      returnKm: p.return_km,
      damaged: p.damaged ?? false,
    })),
  }
}

// Badge color is derived automatically from the badge text (no manual picker).
// Add new texts here as needed; unknown texts fall back to 'red'.
const BADGE_COLOR_MAP = {
  'populaire': 'red',
  'nouveau':   'blue',
  'top choix': 'red',
  'prestige':  'gold',
}
export function badgeColorFor(badge) {
  if (!badge || !badge.trim()) return null
  return BADGE_COLOR_MAP[badge.trim().toLowerCase()] ?? 'red'
}

// The "Nouveau" badge auto-expires this many months after the car was added.
const NEW_BADGE_MONTHS = 3
// Returns the badge to actually display (null = hide it). "Nouveau" disappears
// 3 months after createdAt; all other badges are permanent.
export function effectiveBadge(car) {
  if (!car.badge || !car.badge.trim()) return null
  if (car.badge.trim().toLowerCase() === 'nouveau' && car.createdAt) {
    const expires = new Date(car.createdAt)
    expires.setMonth(expires.getMonth() + NEW_BADGE_MONTHS)
    if (Date.now() > expires.getTime()) return null
  }
  return car.badge
}

// camelCase form (from admin) → DB columns. Strips fields the DB computes.
function toRow(car) {
  // A car can belong to several categories. The first selected becomes the
  // "main" category (used as the display label); the array is stored only
  // when there's more than one.
  const cats = (car.categories ?? []).filter(Boolean)
  const finalCats = cats.length ? cats : ['economique']
  // First photo in the gallery is the cover used on the cards.
  const photos = (car.photos ?? []).filter(Boolean)
  const cover = photos[0] || car.photo || null
  return {
    name: car.name,
    category: finalCats[0],
    categories: finalCats.length > 1 ? finalCats : null,
    photo: cover,
    photos: photos.length ? photos : (cover ? [cover] : null),
    brand_logo: car.brandLogo || null,
    brand_color: car.brandColor || '#1a1a1a',
    white_filter: !!car.whiteFilter,
    price: Number(car.price) || 0,
    currency: car.currency || 'MAD',
    fuel: car.fuel || 'Diesel',
    transmission: car.transmission || 'Manuel',
    seats: Number(car.seats) || 5,
    features: (car.features ?? []).filter(Boolean).length ? car.features.filter(Boolean) : null,
    badge: car.badge || null,
    badge_color: badgeColorFor(car.badge),
    sort_order: Number(car.sortOrder) || 0,
    color: car.color || null,
    immatriculation: car.immatriculation || null,
    damaged: !!car.damaged,
  }
}

// The public site treats each row as a physical unit. Merge units that share
// the same model name into a single card. The merged card keeps the first
// unit's display info, plus `units` (all rows) and `colors` (distinct colours).
export function mergeByModel(cars) {
  const map = new Map()
  for (const car of cars) {
    const key = car.name.trim().toLowerCase()
    if (!map.has(key)) {
      map.set(key, { ...car, units: [car], colors: car.color ? [car.color] : [], features: [...(car.features ?? [])] })
    } else {
      const m = map.get(key)
      m.units.push(car)
      if (car.color && !m.colors.includes(car.color)) m.colors.push(car.color)
      if (car.price < m.price) m.price = car.price // show the lowest price
      // Union features across units so the merged card lists every option.
      for (const f of car.features ?? []) if (!m.features.includes(f)) m.features.push(f)
    }
  }
  return [...map.values()]
}

// A merged model is available for the dates if ANY of its units is free.
export function isModelAvailable(model, depart, retour) {
  const units = model.units ?? [model]
  return units.some(u => isCarAvailable(u, depart, retour))
}

// ── Public read ─────────────────────────────────────────────────────────────
// Returns all cars with their blocked date ranges, for the PUBLIC site.
// Privacy: never reads client PII (name/CIN/phone/licence). It reads only the
// `car_availability` view (date ranges) — see migration-privacy.sql.
// Falls back to the static data.js list when Supabase isn't configured yet.
export async function fetchCars() {
  if (!isSupabaseConfigured) {
    return staticCars.map(c => ({ ...c, unavailable: [] }))
  }
  const [carsRes, availRes] = await Promise.all([
    supabase
      .from('cars')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase.from('car_availability').select('*'),
  ])

  if (carsRes.error) {
    console.error('fetchCars failed, falling back to static data:', carsRes.error.message)
    return staticCars.map(c => ({ ...c, unavailable: [] }))
  }
  // The view may be missing during initial setup — degrade to "no blocks"
  // rather than breaking the public listing.
  if (availRes.error) {
    console.error('car_availability read failed, showing cars without date blocks:', availRes.error.message)
  }
  const byCar = new Map()
  for (const p of availRes.data ?? []) {
    if (!byCar.has(p.car_id)) byCar.set(p.car_id, [])
    byCar.get(p.car_id).push({ start_date: p.start_date, end_date: p.end_date })
  }
  return carsRes.data.map(row => fromRow({ ...row, unavailable_periods: byCar.get(row.id) ?? [] }))
}

// ── Admin read ──────────────────────────────────────────────────────────────
// Like fetchCars but reads the FULL reservation rows (incl. client PII) — only
// works for authenticated admins (RLS). Throws on error so the dashboard can
// surface it instead of silently showing stale/static data.
export async function fetchCarsAdmin() {
  if (!isSupabaseConfigured) {
    return staticCars.map(c => ({ ...c, unavailable: [] }))
  }
  const { data, error } = await supabase
    .from('cars')
    .select('*, unavailable_periods(*)')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data.map(fromRow)
}

// ── Availability ────────────────────────────────────────────────────────────
// A car is unavailable if any blocked period overlaps the requested range.
// Overlap rule: period.start <= retour AND period.end >= depart.
// If no return date is given, we treat it as a single-day request (= depart).
export function isCarAvailable(car, depart, retour) {
  // A damaged / out-of-service car is never available.
  if (car.damaged) return false
  if (!depart) return true
  const end = retour || depart
  const periods = car.unavailable ?? []
  return !periods.some(p => p.start <= end && p.end >= depart)
}

// ── Admin: photo upload ─────────────────────────────────────────────────────
// Uploads to the public 'car-photos' bucket and returns the public URL.
// Only allow real image types; reject anything else before it reaches storage.
const ALLOWED_IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'])

export async function uploadCarPhoto(file) {
  if (!supabase) throw new Error('Supabase non configuré.')
  if (!file.type.startsWith('image/')) throw new Error('Seules les images sont autorisées.')
  // Derive a safe extension from the filename: strip anything that isn't a
  // letter/digit (no path separators, no dots) so the storage key can't be
  // manipulated, and fall back to 'jpg' for unknown/odd types.
  const rawExt = (file.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const ext = ALLOWED_IMAGE_EXT.has(rawExt) ? rawExt : 'jpg'
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage
    .from('car-photos')
    .upload(path, file, { cacheControl: '3600', upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from('car-photos').getPublicUrl(path)
  return data.publicUrl
}

// Uploads several files and returns their public URLs (in order).
export async function uploadCarPhotos(files) {
  const urls = []
  for (const file of files) urls.push(await uploadCarPhoto(file))
  return urls
}

// ── Admin: CRUD ─────────────────────────────────────────────────────────────
// Renumber every car to a clean, contiguous 0,1,2,3… (so no duplicates, no
// gaps). When `placeId`/`placeIndex` are given, that car is pulled out of the
// list and re-inserted at exactly `placeIndex`, with every other car shifting
// by one to make room. Because we rebuild the list explicitly (instead of
// relying on a tie-breaker), this lands the car correctly whether it moves UP
// (e.g. 5 → 3: the old 3,4… become 4,5…) or DOWN (e.g. 3 → 5).
async function normalizeOrder(placeId = null, placeIndex = null) {
  if (!isSupabaseConfigured) return
  const { data, error } = await supabase
    .from('cars')
    .select('id, sort_order, created_at')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error

  let ids = data.map(r => r.id)
  if (placeId != null && placeIndex != null) {
    ids = ids.filter(id => id !== placeId)
    const idx = Math.max(0, Math.min(placeIndex, ids.length))
    ids.splice(idx, 0, placeId)
  }
  // Only write the rows whose number actually changes.
  const current = new Map(data.map(r => [r.id, r.sort_order]))
  await Promise.all(
    ids
      .map((id, i) => (current.get(id) === i ? null : supabase.from('cars').update({ sort_order: i }).eq('id', id)))
      .filter(Boolean)
  )
}

export async function createCar(car) {
  const row = toRow(car)
  const { data, error } = await supabase.from('cars').insert(row).select().single()
  if (error) throw error
  // Drop the new car into the requested slot; everything below it shifts down.
  await normalizeOrder(data.id, row.sort_order)
  return fromRow(data)
}

export async function updateCar(id, car) {
  const row = toRow(car)
  const { data, error } = await supabase.from('cars').update(row).eq('id', id).select().single()
  if (error) throw error
  // Move this car to its requested slot and renumber the rest around it.
  await normalizeOrder(id, row.sort_order)
  return fromRow(data)
}

// Move a car to a specific display slot (0-based) without touching its other
// fields — used by the drag-to-reorder handle in the admin list.
export async function setCarOrder(id, index) {
  await normalizeOrder(id, index)
}

export async function deleteCar(id) {
  const { error } = await supabase.from('cars').delete().eq('id', id)
  if (error) throw error
  // Close the gap left behind so numbering stays contiguous.
  await normalizeOrder()
}

// ── Admin: blocked date ranges ──────────────────────────────────────────────
// Creates a reservation: blocks the car for [start, end] and records the client.
export async function addReservation(carId, r) {
  const { data, error } = await supabase
    .from('unavailable_periods')
    .insert({
      car_id: carId,
      start_date: r.start,
      end_date: r.end,
      client_name: r.clientName || null,
      cin: r.cin || null,
      tel: r.tel || null,
      matriculation: r.matriculation || null,
      licence_number: r.licenceNumber || null,
      second_driver_name: r.secondDriverName || null,
      second_driver_cin: r.secondDriverCin || null,
      second_driver_licence: r.secondDriverLicence || null,
    })
    .select()
    .single()
  if (error) throw error
  return {
    id: data.id, start: data.start_date, end: data.end_date,
    clientName: data.client_name, cin: data.cin, tel: data.tel, matriculation: data.matriculation,
  }
}

// Security check: one CIN should map to one identity. Returns an existing
// client name registered under this CIN that DIFFERS from `name` (or null).
// Uses an indexed `cin` lookup (see migration-cin-index.sql) so it stays light
// — it only fetches rows for this single CIN, never the whole table.
export async function findCinConflict(cin, name) {
  const c = (cin || '').trim()
  if (!c || !isSupabaseConfigured) return null
  const { data, error } = await supabase
    .from('unavailable_periods')
    .select('client_name')
    .eq('cin', c)
    .limit(100)
  if (error) throw error
  const target = (name || '').trim().toLowerCase()
  for (const row of data) {
    const existing = (row.client_name || '').trim()
    if (existing && existing.toLowerCase() !== target) return existing
  }
  return null
}

export async function updateReservation(periodId, r) {
  const { error } = await supabase
    .from('unavailable_periods')
    .update({
      start_date: r.start,
      end_date: r.end,
      client_name: r.clientName || null,
      cin: r.cin || null,
      tel: r.tel || null,
      licence_number: r.licenceNumber || null,
      second_driver_name: r.secondDriverName || null,
      second_driver_cin: r.secondDriverCin || null,
      second_driver_licence: r.secondDriverLicence || null,
    })
    .eq('id', periodId)
  if (error) throw error
}

// Fix the pick-up odometer reading for a car that's already handed over.
export async function updateDepartureKm(periodId, km) {
  const { error } = await supabase
    .from('unavailable_periods')
    .update({ departure_km: km != null && km !== '' ? Number(km) : null })
    .eq('id', periodId)
  if (error) throw error
}

export async function deletePeriod(periodId) {
  const { error } = await supabase.from('unavailable_periods').delete().eq('id', periodId)
  if (error) throw error
}

// Hand the car over to the client: reservee → en_cours, recording the
// odometer reading at pick-up.
export async function confirmPickup(periodId, departureKm) {
  const { error } = await supabase
    .from('unavailable_periods')
    .update({ status: 'en_cours', departure_km: departureKm != null && departureKm !== '' ? Number(departureKm) : null })
    .eq('id', periodId)
  if (error) throw error
}

// Take the car back: en_cours → terminee, recording the odometer reading at
// return and whether the car came back damaged.
export async function confirmReturn(periodId, returnKm, damaged = false, carId = null) {
  const km = returnKm != null && returnKm !== '' ? Number(returnKm) : null
  const { error } = await supabase
    .from('unavailable_periods')
    .update({ status: 'terminee', return_km: km, damaged: !!damaged })
    .eq('id', periodId)
  if (error) throw error
  if (carId && km != null) {
    const { error: e2 } = await supabase.from('cars').update({ last_km: km }).eq('id', carId)
    if (e2) throw e2
  }
}

// Mark a car as damaged (out-of-service) or clear that flag.
export async function setCarDamaged(carId, damaged) {
  const { error } = await supabase.from('cars').update({ damaged: !!damaged }).eq('id', carId)
  if (error) throw error
}

// Has this CIN ever returned a car damaged? Indexed lookup on cin → light.
export async function findCinDamage(cin) {
  const c = (cin || '').trim()
  if (!c || !isSupabaseConfigured) return false
  const { data, error } = await supabase
    .from('unavailable_periods')
    .select('id')
    .eq('cin', c)
    .eq('damaged', true)
    .limit(1)
  if (error) throw error
  return data.length > 0
}

// ── Admin: car services (maintenance log) ───────────────────────────────────
export async function fetchCarServices(carId) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('car_services')
    .select('*')
    .eq('car_id', carId)
    .order('service_date', { ascending: false, nullsFirst: false })
  if (error) throw error
  return data.map(s => ({
    id: s.id, service: s.service, date: s.service_date,
    mileage: s.mileage, cost: s.cost, note: s.note,
  }))
}

export async function addCarService(carId, s) {
  const km = s.mileage ? Number(s.mileage) : null
  const { error } = await supabase.from('car_services').insert({
    car_id: carId,
    service: s.service,
    service_date: s.date || null,
    mileage: km,
    cost: s.cost ? Number(s.cost) : null,
    note: s.note || null,
  })
  if (error) throw error
  if (km != null) {
    const { error: e2 } = await supabase.from('cars').update({ last_km: km }).eq('id', carId)
    if (e2) throw e2
  }
}

export async function deleteCarService(id) {
  const { error } = await supabase.from('car_services').delete().eq('id', id)
  if (error) throw error
}
