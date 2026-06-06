import { supabase, isSupabaseConfigured } from './supabase'
import { MIN_RENTAL_DAYS } from '../data'

// Fallback values used before the settings load, when Supabase isn't
// configured, or if the read fails. Keep these in sync with the seed row in
// migration-settings.sql.
export const DEFAULT_SETTINGS = {
  whatsapp: '212661000000',   // international digits, no leading 0
  instagramUrl: '',
  facebookUrl: '',
  minRentalDays: MIN_RENTAL_DAYS,
}

// DB row (snake_case) → app shape (camelCase), filling any blanks with defaults.
function fromRow(row) {
  return {
    whatsapp: row.whatsapp || DEFAULT_SETTINGS.whatsapp,
    instagramUrl: row.instagram_url || '',
    facebookUrl: row.facebook_url || '',
    minRentalDays: row.min_rental_days ?? DEFAULT_SETTINGS.minRentalDays,
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
      instagram_url: s.instagramUrl?.trim() || null,
      facebook_url: s.facebookUrl?.trim() || null,
      min_rental_days: Math.max(1, Number(s.minRentalDays) || DEFAULT_SETTINGS.minRentalDays),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (error) throw error
  return fromRow(data)
}
