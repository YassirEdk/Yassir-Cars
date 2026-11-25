import { Link } from 'react-router-dom'
import Icon from './Icon'
import { useSettings } from '../lib/SettingsContext'
import { discountLabel, promotionRuns } from '../lib/pricing'
import './promo.css'

export default function PromoBanner() {
  const { settings } = useSettings()

  // Nothing running → no banner. This used to advertise "30% sur les locations
  // de plus de 7 jours" while the site actually applied 30% to everything,
  // always. The banner now says exactly what the prices below it do.
  if (!promotionRuns(settings)) return null

  const scope = settings.discountAllCars
    ? 'Sur toutes nos locations'
    : 'Sur une sélection de véhicules'

  return (
    <section className="promo" id="promo">
      <div className="container">
        <div className="promo__card">
          <p className="promo__rate">{discountLabel(settings.discountRate)}</p>
          <div className="promo__text">
            <h2>{settings.discountTitle || 'Offre Spéciale'}</h2>
            <p>{scope}, remise déjà appliquée aux prix affichés.</p>
          </div>
          {/* Opens the fleet page filtered to the discounted cars, and carries
              this banner as the place to come back to — anchoring on #promo works
              even when there is no history entry to restore (reload, shared
              link), unlike a saved scroll offset. */}
          <Link to="/flotte?promo=1" state={{ back: 'promo' }} className="btn btn-primary btn-lg promo__go">
            Profiter de l’offre <Icon name="arrowRight" className="btn__arrow" />
          </Link>
        </div>
      </div>
    </section>
  )
}
