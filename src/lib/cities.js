/* Place lookups (cities and airports) shared by the dropdown (CityMenu), the wheel
   (CityWheel) and the booking forms. */
import { airports } from '../data'

const POPULAR = ['Casablanca', 'Aéroport Mohammed V', 'Marrakech', 'Rabat', 'Tanger', 'Agadir', 'Fès']

const AIRPORTS = new Map(airports.map(a => [a.name, a]))

export const isAirport = (place) => AIRPORTS.has(place)

// The city of an airport whose name doesn't say it ("Casablanca" for Mohammed V).
export function placeHint(place) {
  const city = AIRPORTS.get(place)?.city
  return city && !place.includes(city) ? city : ''
}

// "à Rabat", "à l’aéroport Mohammed V"
export const atPlace = (place) => (isAirport(place) ? `à l’a${place.slice(1)}` : `à ${place}`)

// Accent-insensitive: "fes" finds Fès, "kenitra" finds Kénitra.
const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

// Airports answer to their city and to their code as well.
const words = (place) => {
  const a = AIRPORTS.get(place)
  return norm(a ? `${place} ${a.city} ${a.code}` : place)
}

export const popularCities = (cities) => POPULAR.filter(c => cities.includes(c))

// Prefix matches first, then matches anywhere in the name.
export function searchCities(cities, query) {
  const q = norm(query.trim())
  if (!q) return cities
  const starts = cities.filter(c => norm(c).startsWith(q))
  const inside = cities.filter(c => !norm(c).startsWith(q) && words(c).includes(q))
  return [...starts, ...inside]
}
