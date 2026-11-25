import { colorName } from '../data'

/* Colours of a car card. Several: buttons that switch the card to that car. One:
   just its name with a swatch, since there is nothing to choose.
   `named={false}`: the dots alone, where the card says the colour elsewhere. */
export default function ColorDots({ colors, value, onPick, isTaken = () => false, note = '', named = true }) {
  if (!colors.length) return null

  return (
    <div className="car-colors">
      {colors.length > 1
        ? colors.map(hex => (
          <button
            type="button"
            key={hex}
            className={`car-color-dot ${hex === value ? 'active' : ''} ${isTaken(hex) ? 'taken' : ''}`}
            style={{ background: hex }}
            title={`${colorName(hex)}${isTaken(hex) ? ' — réservé' : ''}`}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPick(hex) }}
            aria-label={`Couleur ${colorName(hex)}${isTaken(hex) ? ', réservée' : ''}`}
            aria-pressed={hex === value}
          />
        ))
        : <span className="car-color-swatch" style={{ background: colors[0] }} aria-hidden="true" />}
      {named && <span className="car-colors__label">{colorName(value ?? colors[0])}{note}</span>}
    </div>
  )
}
