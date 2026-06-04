import { supabase, isSupabaseConfigured } from './supabase'
import { cars as staticCars } from '../data'

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
    extra: row.extra,
    badge: row.badge,
    badgeColor: row.badge_color,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    // Date ranges this car is blocked, e.g. [{ start: '2026-06-10', end: '2026-06-15' }]
    unavailable: (row.unavailable_periods ?? []).map(p => ({
      id: p.id,
      start: p.start_date,
      end: p.end_date,
      note: p.note,
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
    extra: car.extra || 'Clim',
    badge: car.badge || null,
    badge_color: badgeColorFor(car.badge),
    sort_order: Number(car.sortOrder) || 0,
  }
}

// ── Public read ─────────────────────────────────────────────────────────────
// Returns all cars (with their blocked date ranges). Falls back to the
// static data.js list when Supabase isn't configured yet.
export async function fetchCars() {
  if (!isSupabaseConfigured) {
    return staticCars.map(c => ({ ...c, unavailable: [] }))
  }
  const { data, error } = await supabase
    .from('cars')
    .select('*, unavailable_periods(*)')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('fetchCars failed, falling back to static data:', error.message)
    return staticCars.map(c => ({ ...c, unavailable: [] }))
  }
  return data.map(fromRow)
}

// ── Availability ────────────────────────────────────────────────────────────
// A car is unavailable if any blocked period overlaps the requested range.
// Overlap rule: period.start <= retour AND period.end >= depart.
// If no return date is given, we treat it as a single-day request (= depart).
export function isCarAvailable(car, depart, retour) {
  if (!depart) return true
  const end = retour || depart
  const periods = car.unavailable ?? []
  return !periods.some(p => p.start <= end && p.end >= depart)
}

// ── Admin: photo upload ─────────────────────────────────────────────────────
// Uploads to the public 'car-photos' bucket and returns the public URL.
export async function uploadCarPhoto(file) {
  if (!supabase) throw new Error('Supabase non configuré.')
  const ext = file.name.split('.').pop()
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
export async function createCar(car) {
  const { data, error } = await supabase.from('cars').insert(toRow(car)).select().single()
  if (error) throw error
  return fromRow(data)
}

export async function updateCar(id, car) {
  const { data, error } = await supabase.from('cars').update(toRow(car)).eq('id', id).select().single()
  if (error) throw error
  return fromRow(data)
}

export async function deleteCar(id) {
  const { error } = await supabase.from('cars').delete().eq('id', id)
  if (error) throw error
}

// ── Admin: blocked date ranges ──────────────────────────────────────────────
export async function addUnavailablePeriod(carId, start, end, note = null) {
  const { data, error } = await supabase
    .from('unavailable_periods')
    .insert({ car_id: carId, start_date: start, end_date: end, note })
    .select()
    .single()
  if (error) throw error
  return { id: data.id, start: data.start_date, end: data.end_date, note: data.note }
}

export async function deletePeriod(periodId) {
  const { error } = await supabase.from('unavailable_periods').delete().eq('id', periodId)
  if (error) throw error
}
