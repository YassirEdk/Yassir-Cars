/* Supabase for the public site, without the client library.

   Reading a table needs no auth, no realtime and no storage: the parts that make
   @supabase/supabase-js heavy (over half of the home page's JavaScript). So the
   public pages read through restSelect(), plain GETs on Supabase's REST
   endpoint, and the library is only fetched by getSupabase() — the admin, its
   login and its writes. A visitor never downloads it. */

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// True only when both env vars are present. Lets the rest of the app
// gracefully fall back to the static src/data.js cars during setup.
export const isSupabaseConfigured = Boolean(url && key)

// GET /rest/v1/<path> with the public key. Same { data, error } shape as the SDK.
export async function restSelect(path) {
  try {
    const res = await fetch(`${url}/rest/v1/${path}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
    if (!res.ok) return { data: null, error: new Error(`${res.status} ${res.statusText}`) }
    return { data: await res.json(), error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}

// The full client, loaded on first use. null when Supabase isn't configured.
export const getSupabase = () => import('./supabase').then(m => m.supabase)
