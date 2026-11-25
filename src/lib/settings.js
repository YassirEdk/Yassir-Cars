import { supabase, isSupabaseConfigured } from './supabase'
import { MIN_RENTAL_DAYS } from '../data'

// Values used before the settings load, when Supabase isn't configured, or if
// the read fails. They must be safe to show: no number a customer could write
// to by mistake, and no discount the agency hasn't actually switched on.
export const DEFAULT_SETTINGS = {
  // Blank on purpose: every consumer hides its contact block (or refuses to
  // send) when these are empty, so the site can never ship a placeholder number
  // a customer might dial or message.
  whatsapp: '',               // international digits, no leading 0
  phone: '',                  // international digits, no leading 0
  contactEmail: '',
  address: '',
  instagramUrl: '',
  facebookUrl: '',
  tiktokUrl: '',
  minRentalDays: MIN_RENTAL_DAYS,
  // Promotion: off until the real settings say otherwise.
  discountRate: 0,
  // Headline of the promo banner. Editable so a campaign can be named
  // ("Offre de l'été", "Black Friday") without a code change.
  discountTitle: 'Offre Spéciale',
  discountActive: false,
  discountAllCars: true,
  discountCarIds: [],
}

// DB row (snake_case) → app shape (camelCase), filling any blanks with defaults.
function fromRow(row) {
  return {
    whatsapp: row.whatsapp || '',
    phone: row.phone || '',
    contactEmail: row.contact_email || '',
    address: row.address || '',
    instagramUrl: row.instagram_url || '',
    facebookUrl: row.facebook_url || '',
    tiktokUrl: row.tiktok_url || '',
    minRentalDays: row.min_rental_days ?? DEFAULT_SETTINGS.minRentalDays,
    discountRate: row.discount_rate ?? DEFAULT_SETTINGS.discountRate,
    discountTitle: row.discount_title || DEFAULT_SETTINGS.discountTitle,
    discountActive: row.discount_active ?? DEFAULT_SETTINGS.discountActive,
    discountAllCars: row.discount_all_cars ?? DEFAULT_SETTINGS.discountAllCars,
    // Always a list of strings — car ids are uuids and get compared as strings.
    discountCarIds: (row.discount_car_ids ?? []).map(String),
  }
}

// Public read. Throws when the read fails, so the caller can tell "no settings
// yet" apart from the real ones; a missing row means defaults.
export async function fetchSettings() {
  if (!isSupabaseConfigured) return { ...DEFAULT_SETTINGS }
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle()
  if (error) throw error
  return data ? fromRow(data) : { ...DEFAULT_SETTINGS }
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
      discount_title: s.discountTitle?.trim() || null,
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
