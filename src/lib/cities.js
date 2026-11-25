/* City lookups shared by the dropdown (CityMenu) and the wheel (CityWheel). */

const POPULAR = ['Casablanca', 'Marrakech', 'Rabat', 'Tanger', 'Agadir', 'Fès']

// Accent-insensitive: "fes" finds Fès, "kenitra" finds Kénitra.
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export const popularCities = (cities) => POPULAR.filter(c => cities.includes(c))

// Prefix matches first, then matches anywhere in the name.
export function searchCities(cities, query) {
  const q = norm(query.trim())
  if (!q) return cities
  const starts = cities.filter(c => norm(c).startsWith(q))
  const inside = cities.filter(c => !norm(c).startsWith(q) && norm(c).includes(q))
  return [...starts, ...inside]
}
