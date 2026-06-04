import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// True only when both env vars are present. Lets the rest of the app
// gracefully fall back to the static src/data.js cars during setup.
export const isSupabaseConfigured = Boolean(url && key)

// When not configured we export null instead of a half-broken client.
export const supabase = isSupabaseConfigured ? createClient(url, key) : null
