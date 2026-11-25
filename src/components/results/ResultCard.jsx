import { useState } from 'react'
import { categoryLabel, colorName } from '../../data'
import { isCarAvailable, unitForColor, effectiveBadge, nextFreeDateForModel } from '../../lib/cars'
import { useSettings } from '../../lib/SettingsContext'
import { useCurrency } from '../../lib/CurrencyContext'
import { CURRENCIES, convert, formatMoney, formatNumber } from '../../lib/currency'
import { discounted, discountLabel, rateForCar } from '../../lib/pricing'
import { waLink } from '../../lib/contact'
import { formatLongDate } from '../../lib/dates'
import PhotoRail from '../PhotoRail'
import ColorDots from '../ColorDots'
import FeaturePills from '../FeaturePills'
import Icon from '../Icon'
import SocialIcon from '../SocialIcon'

/* One model in the results. `car` comes from narrowModels(): its units are the
   ones that match the filters. `showOk`: say "Disponible" too — only worth it
   when some of the results are not. */
export default function ResultCard({ car, days, depart, retour, showOk, onCall, onSearchFrom, onReserve, isOpen, eager }) {
  const { currency } = useCurrency()
  const { settings } = useSettings()
  const [logoFailed, setLogoFailed] = useState(false)

  // Pick a colour → switch to that unit (photos, price, specs follow it).
  const colors = car.colors
  const colorFree = (hex) => isCarAvailable(unitForColor(car, hex, depart, retour), depart, retour)
  const [picked, setPicked] = useState(null)
  // A filter can remove the picked colour: fall back to the one on offer.
  const color = colors.includes(picked) ? picked : car.shownColor
  const active = unitForColor(car, color, depart, retour)
  const activeFree = isCarAvailable(active, depart, retour)

  const photos = active.photos?.length ? active.photos : (active.photo ? [active.photo] : [])
  const badge = effectiveBadge(active)
  // Only computed for cards that came back unavailable.
  const freeFrom = car.available ? null : nextFreeDateForModel(car, depart)
  const lastOne = car.available && car.units.length > 1 && car.freeUnits === 1

  // The promotion is per car, so it follows the colour/unit the visitor picked.
  const rate = rateForCar(active.id, settings)
  const price = discounted(active.price, rate)
  const promo = discountLabel(rate)

  return (
    <article className={`result-card ${activeFree ? '' : 'result-card--unavailable'} ${isOpen ? 'result-card--open' : ''}`}>
      <div className="rc-media stage">
        <PhotoRail
          key={active.id}
          photos={photos}
          eager={eager}
          alt={`${car.name}${color ? ` ${colorName(color).toLowerCase()}` : ''}`}
          fallback={
            <div className="rc-media__none" style={{ background: active.brandColor }}>
              {active.brandLogo && !logoFailed
                ? <img src={active.brandLogo} alt={car.name} loading="lazy" onError={() => setLogoFailed(true)}
                    style={active.whiteFilter ? { filter: 'brightness(0) invert(1)' } : undefined} />
                : <span>{car.name.split(' ')[0]}</span>}
            </div>
          }
        />
        {badge && <span className={`result-badge result-badge--${active.badgeColor}`}>{badge}</span>}
        {!activeFree
          ? <span className="avail-tag avail-tag--no"><Icon name="calendarX" size="1.3em" /> Non disponible</span>
          : lastOne
            ? <span className="avail-tag avail-tag--last">Plus que 1</span>
            : showOk && <span className="avail-tag avail-tag--ok"><Icon name="calendarCheck" size="1.3em" /> Disponible</span>}
      </div>

      <div className="rc-info">
        <div className="rc-head">
          <h2 className="rc-name">{car.name}</h2>
          <p className="rc-cats">{car.categories.map(categoryLabel).join(' · ')}</p>
        </div>

        <div className="rc-details">
          <ColorDots
            colors={colors}
            value={color}
            onPick={setPicked}
            isTaken={(hex) => Boolean(depart) && !colorFree(hex)}
            note={activeFree ? '' : ' — réservé'}
          />
          <ul className="rc-specs">
            <li><Icon name="gear" /> {active.transmission}</li>
            <li><Icon name="users" /> {active.seats} places</li>
            <li><Icon name="fuel" /> {active.fuel}</li>
          </ul>
          <p className="rc-included">
            <Icon name="checkCircle" /> Kilométrage illimité · Assurance incluse · Assistance 24h/24
          </p>
          <FeaturePills features={active.features} className="rc-equip" limit={4} mobileLimit={3} short />
        </div>
      </div>

      <div className="rc-buy">
        <div className="rc-price">
          {promo && (
            <div className="rc-price__old">
              <s>{formatMoney(active.price, currency)}</s>
              <span className="result-discount">{promo}</span>
            </div>
          )}
          <p className="rc-price__day">
            <strong>{formatNumber(convert(price, currency))}</strong> <span className="rc-price__cur">{CURRENCIES[currency].symbol} / jour</span>
          </p>
          {days > 1 && (
            <p className="rc-price__total">
              Total <strong>{formatMoney(price * days, currency)}</strong>
              {promo && <> <s>{formatMoney(active.price * days, currency)}</s></>}
            </p>
          )}
        </div>

        <div className="rc-actions">
          {car.available ? (
            /* Opens the booking drawer on the right instead of navigating away,
               so the rest of the results stay on screen. */
            <button
              type="button"
              className="result-reserve"
              onClick={() => onReserve(car, activeFree ? color : null)}
              aria-expanded={isOpen}
              aria-label={`Réserver maintenant : ${car.name}`}
            >
              Réserver maintenant
            </button>
          ) : (
            /* Rather than dead-ending, offer the first date this model frees up. */
            <div className="result-unavailable">
              <span className="result-unavailable-label">Indisponible pour ces dates</span>
              {freeFrom && (
                <button type="button" className="result-freefrom" onClick={() => onSearchFrom(freeFrom)}>
                  <span>Libre dès le <strong>{formatLongDate(freeFrom)}</strong></span>
                </button>
              )}
            </div>
          )}

          {/* With a call number configured, offer the choice; without one, skip
              the modal entirely and go straight to WhatsApp. */}
          {settings.phone ? (
            <button type="button" className="result-phone" onClick={() => onCall(car)} aria-label={`Appeler pour la ${car.name}`}>
              <Icon name="phone" /> <span>Appeler</span>
            </button>
          ) : settings.whatsapp && (
            <a
              className="result-phone"
              href={waLink(settings.whatsapp, `Bonjour YASSIR CARS, je suis intéressé par la ${car.name}.`)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Écrire sur WhatsApp pour la ${car.name}`}
            >
              <SocialIcon name="whatsapp" /> <span>WhatsApp</span>
            </a>
          )}
        </div>
      </div>
    </article>
  )
}

/* Placeholder card shown while the cars are still loading. */
export function ResultSkeleton() {
  return (
    <div className="result-card result-skeleton" aria-hidden="true">
      <div className="rc-media stage" />
      <div className="rc-info">
        <div className="sk-line sk-line--title" />
        <div className="sk-line sk-line--short" />
        <div className="sk-line" />
      </div>
      <div className="rc-buy"><div className="sk-line sk-line--btn" /></div>
    </div>
  )
}
