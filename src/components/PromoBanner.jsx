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
    <section className="promo-banner">
      <div className="container promo-inner">
        <div className="promo-text">
          <h2><Icon name="sparkles" /> Offre Spéciale</h2>
          <p>
            <strong>{rate}% de réduction</strong> {scope} —
            remise déjà appliquée aux prix affichés.
          </p>
        </div>
        <a href="#reserver" className="btn btn-white btn-lg">Profiter de l'offre →</a>
      </div>
    </section>
  )
}
