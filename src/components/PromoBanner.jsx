import { Link } from 'react-router-dom'
import Icon from './Icon'
import { useSettings } from '../lib/SettingsContext'
import { normalizeRate, promotionRuns } from '../lib/pricing'

export default function PromoBanner() {
  const { settings } = useSettings()

  // Nothing running → no banner. This used to advertise "30% sur les locations
  // de plus de 7 jours" while the site actually applied 30% to everything,
  // always. The banner now says exactly what the prices below it do.
  if (!promotionRuns(settings)) return null

  const rate = normalizeRate(settings.discountRate)
  const scope = settings.discountAllCars
    ? 'sur toutes nos locations'
    : 'sur une sélection de véhicules'

  return (
    <section className="promo-banner" id="promo">
      <div className="container promo-inner">
        <div className="promo-text">
          <h2><Icon name="sparkles" /> {settings.discountTitle || 'Offre Spéciale'}</h2>
          <p>
            <strong>{rate}% de réduction</strong> {scope} —
            remise déjà appliquée aux prix affichés.
          </p>
        </div>
        {/* Opens the fleet page filtered to the discounted cars, and carries
            this banner as the place to come back to — anchoring on #promo works
            even when there is no history entry to restore (reload, shared
            link), unlike a saved scroll offset. */}
        <Link to="/flotte?promo=1" state={{ back: 'promo' }} className="btn btn-white btn-lg">
          Profiter de l'offre →
        </Link>
      </div>
    </section>
  )
}
