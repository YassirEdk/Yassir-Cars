import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// True only when both env vars are present. Lets the rest of the app
// gracefully fall back to the static src/data.js cars during setup.
export const isSupabaseConfigured = Boolean(url && key)

// Auth session lives in sessionStorage, not localStorage: it survives page
// reloads within the same tab (so a tab left open 24/7 stays logged in, with
// the token auto-refreshing), but is wiped as soon as the tab/window is closed
// — closing the tab logs the admin out. sessionStorage is per-tab, so opening
// the admin in a new tab requires a fresh login.
const authOptions =
  typeof window !== 'undefined'
    ? {
        auth: {
          storage: window.sessionStorage,
          persistSession: true,
          autoRefreshToken: true,
        },
      }
    : undefined

// When not configured we export null instead of a half-broken client.
export const supabase = isSupabaseConfigured
  ? createClient(url, key, authOptions)
  : null
