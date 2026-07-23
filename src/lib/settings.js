import { supabase, isSupabaseConfigured } from './supabase'
import { MIN_RENTAL_DAYS } from '../data'

// Fallback values used before the settings load, when Supabase isn't
// configured, or if the read fails. Keep these in sync with the seed row in
// migration-settings.sql.
export const DEFAULT_SETTINGS = {
  whatsapp: '212661000000',   // international digits, no leading 0
  // Blank on purpose: every consumer hides its phone/email block when these are
  // empty, so the site can never ship a placeholder number a customer might dial.
  phone: '',                  // international digits, no leading 0
  contactEmail: '',
  address: '',
  instagramUrl: '',
  facebookUrl: '',
  tiktokUrl: '',
  minRentalDays: MIN_RENTAL_DAYS,
  // Promotion. Defaults match what the site displayed before this became
  // configurable: 30% off the whole fleet.
  discountRate: 30,
  discountActive: true,
  discountAllCars: true,
  discountCarIds: [],
}

// DB row (snake_case) → app shape (camelCase), filling any blanks with defaults.
function fromRow(row) {
  return {
    whatsapp: row.whatsapp || DEFAULT_SETTINGS.whatsapp,
    phone: row.phone || '',
    contactEmail: row.contact_email || '',
    address: row.address || '',
    instagramUrl: row.instagram_url || '',
    facebookUrl: row.facebook_url || '',
    tiktokUrl: row.tiktok_url || '',
    minRentalDays: row.min_rental_days ?? DEFAULT_SETTINGS.minRentalDays,
    discountRate: row.discount_rate ?? DEFAULT_SETTINGS.discountRate,
    discountActive: row.discount_active ?? DEFAULT_SETTINGS.discountActive,
    discountAllCars: row.discount_all_cars ?? DEFAULT_SETTINGS.discountAllCars,
    // Always a list of strings — car ids are uuids and get compared as strings.
    discountCarIds: (row.discount_car_ids ?? []).map(String),
  }
}

// Public read — always resolves to a usable object (never throws).
export async function fetchSettings() {
  if (!isSupabaseConfigured) return { ...DEFAULT_SETTINGS }
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle()
  if (error || !data) {
    if (error) console.error('fetchSettings failed, using defaults:', error.message)
    return { ...DEFAULT_SETTINGS }
  }
  return fromRow(data)
}

// Admin write — upserts the single row (id = 1). Throws on error.
export async function updateSettings(s) {
  const { data, error } = await supabase
    .from('app_settings')
    .upsert({
      id: 1,
      whatsapp: (s.whatsapp || '').replace(/\D/g, '') || null,
      phone: (s.phone || '').replace(/\D/g, '') || null,
      contact_email: s.contactEmail?.trim() || null,
      address: s.address?.trim() || null,
      instagram_url: s.instagramUrl?.trim() || null,
      facebook_url: s.facebookUrl?.trim() || null,
      tiktok_url: s.tiktokUrl?.trim() || null,
      min_rental_days: Math.max(1, Number(s.minRentalDays) || DEFAULT_SETTINGS.minRentalDays),
      // 0 is meaningful here (no promotion), so don't fall back on falsy.
      discount_rate: Math.min(99, Math.max(0, Math.round(Number(s.discountRate) || 0))),
      discount_active: !!s.discountActive,
      discount_all_cars: !!s.discountAllCars,
      discount_car_ids: (s.discountCarIds ?? []).map(String),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (error) throw error
  return fromRow(data)
}
