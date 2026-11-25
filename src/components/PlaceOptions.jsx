import { airports, moroccanCities } from '../data'
import { placeHint } from '../lib/cities'

/* Options of a native <select> of places. */
export default function PlaceOptions() {
  return (
    <>
      <optgroup label="Aéroports">
        {airports.map(({ name }) => (
          <option key={name} value={name}>{placeHint(name) ? `${name} (${placeHint(name)})` : name}</option>
        ))}
      </optgroup>
      <optgroup label="Villes">
        {moroccanCities.map(city => <option key={city} value={city}>{city}</option>)}
      </optgroup>
    </>
  )
}
