/* The visitor's current search (ville + dates), shared by every screen.

   It used to live inside Hero.jsx and only be written when the search form was
   submitted. It is exported here because the car cards need the same answer:
   once the visitor has said where and when, nothing should ask them again —
   they can book straight from the home page instead of being walked through a
   second form. */

const STORAGE_KEY = 'yassir_search'
const SAVE_TTL = 60 * 60 * 1000        // a saved search goes stale after 1h

export function loadSearch() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    // Clears itself ~1h after the last search, so the fields don't stay filled
    // forever and a returning visitor isn't quoted last week's dates.
    if (!data.savedAt || Date.now() - data.savedAt > SAVE_TTL) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return data
  } catch {
    return null
  }
}

export function saveSearch(form) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...form, savedAt: Date.now() }))
  } catch { /* storage blocked */ }
}

/* A search is "complete" only with a city and both dates — the three things a
   booking needs. Anything less and the card still has to ask. */
export function completeSearch() {
  const s = loadSearch()
  if (!s?.lieu || !s?.depart || !s?.retour) return null
  const today = new Date().toISOString().slice(0, 10)
  if (s.depart < today || s.retour <= s.depart) return null
  return { lieu: s.lieu, depart: s.depart, retour: s.retour }
}
