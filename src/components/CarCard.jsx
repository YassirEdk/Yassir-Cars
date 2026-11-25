import { useEffect, useState } from 'react'
import { effectiveBadge, isCarAvailable, unitForColor } from '../lib/cars'
import { colorName, categoryLabel } from '../data'
import { useScrollReveal } from '../hooks/useScrollReveal'
// Fetched on demand (and ahead of time once the page is idle): see bookingPanels.js.
import { AvailabilityModal, ReserveDrawer, preloadBookingPanels, warmBookingPanels } from './bookingPanels'
import PhotoRail from './PhotoRail'
import ColorDots from './ColorDots'
import FeaturePills from './FeaturePills'
import Icon from './Icon'
import { useSettings } from '../lib/SettingsContext'
import { discounted, discountLabel, rateForCar } from '../lib/pricing'
import { formatNumber } from '../lib/currency'
import { completeSearch } from '../lib/searchPrefs'
import './carcard.css'

// Cards of a row come in one after the other.
const STAGGER = 80

/* The colour a card opens on. On the promotion view, one that actually carries the
   discount — otherwise a card could land on its one non-discounted colour and look
   like it doesn't belong in the list. */
export function openingColor(car, preferPromo, settings) {
  if (preferPromo) {
    const cheaper = (car.units ?? [car]).find(u => rateForCar(u.id, settings) > 0)
    if (cheaper?.color) return cheaper.color
  }
  return (car.colors ?? [car.color])[0] ?? null
}

/* Both variants behave the same now: the button books straight away when the
   visitor's search already answers "where and when", and falls back to the
   availability popup otherwise. */
export default function CarCard({ car, preferPromo = false, index = 0, eager = false }) {
  const ref = useScrollReveal((index % 3) * STAGGER)
  const { settings } = useSettings()
  const [logoFailed, setLogoFailed] = useState(false)
  const [showAvail, setShowAvail] = useState(false)
  // Set once the availability popup has the dates: opens the booking panel.
  const [booking, setBooking] = useState(null)
  useEffect(warmBookingPanels, [])

  // A merged card carries every physical unit; picking a colour selects the
  // unit, and the whole card (photos, price, specs) follows that unit.
  const colors = car.colors ?? (car.color ? [car.color] : [])
  const [selColor, setSelColor] = useState(() => openingColor(car, preferPromo, settings))
  /* The visitor's search (ville + dates), when there is a usable one. It also
     decides which car of the chosen colour the card stands for: the free one. */
  const ready = completeSearch()
  const active = unitForColor(car, selColor, ready?.depart, ready?.retour)

  const photos = active.photos?.length ? active.photos : (active.photo ? [active.photo] : [])

  // Promotion follows the selected colour/unit.
  const promoRate = rateForCar(active.id, settings)
  const promoLabel = discountLabel(promoRate)

  /* The visitor has already told the search bar where and when, so the card
     doesn't ask a second time: it opens the booking panel straight away on the
     colour they are looking at. Only when there is no usable search — or the
     car is taken for those dates — does the availability popup appear, since
     that is where the alternatives live. */
  const freeForSearch = ready ? isCarAvailable(active, ready.depart, ready.retour) : false

  const bookNow = Boolean(ready && freeForSearch)

  const openBooking = () => {
    if (bookNow) {
      setBooking({ car, color: selColor, depart: ready.depart, retour: ready.retour, lieu: ready.lieu })
      return
    }
    setShowAvail(true)
  }

  const badge = effectiveBadge(active)
  const badgeClass = {
    red: 'car-badge',
    blue: 'car-badge car-badge--dark',
    gold: 'car-badge car-badge--dark',
  }[active.badgeColor] ?? 'car-badge'

  return (
    <article className="car-card" ref={ref} style={{ viewTransitionName: `car-${car.id}` }}>
      <div className="car-card__media stage">
        <PhotoRail
          key={active.id}
          photos={photos}
          eager={eager}
          alt={`${car.name}${selColor ? ` ${colorName(selColor).toLowerCase()}` : ''}`}
          fallback={
            <div className="car-img-none" style={{ background: active.brandColor }}>
              {active.brandLogo && !logoFailed
                ? <img src={active.brandLogo} alt={car.name} className="car-brand-logo" loading="lazy"
                    style={active.whiteFilter ? { filter: 'brightness(0) invert(1)' } : undefined}
                    onError={() => setLogoFailed(true)} />
                : <span className="car-brand-initial">{car.name.split(' ')[0]}</span>}
            </div>
          }
        />
        {badge && <span className={badgeClass}>{badge}</span>}
      </div>

      <div className="car-info">
        <div className="car-header">
          <div>
            <h3>{car.name}</h3>
            <p className="car-sub">{categoryLabel(car.category)}{selColor && ` · ${colorName(selColor)}`}</p>
          </div>
          {colors.length > 1 && <ColorDots colors={colors} value={selColor} onPick={setSelColor} named={false} />}
        </div>

        <ul className="car-specs">
          <li><Icon name="fuel" /> {active.fuel}</li>
          <li><Icon name="gear" /> {active.transmission}</li>
          <li><Icon name="users" /> {active.seats} places</li>
        </ul>
        <FeaturePills features={active.features} className="car-equip" limit={3} mobileLimit={3} short compact />

        <div className="car-footer">
          <div className="car-price">
            {promoLabel && (
              <p className="car-price__old">
                <s>{formatNumber(active.price)} {active.currency}</s>
                <span className="price-discount">{promoLabel}</span>
              </p>
            )}
            <p className="car-price__now">{formatNumber(discounted(active.price, promoRate))} <small>{active.currency}</small></p>
            <p className="car-price__per">par jour</p>
          </div>
          <button
            type="button"
            className="btn btn-dark car-book"
            onClick={openBooking}
            // Hover or focus usually comes before the click: start the download.
            onPointerEnter={preloadBookingPanels}
            onFocus={preloadBookingPanels}
            aria-label={bookNow ? `Réserver : ${car.name}` : `Vérifier la disponibilité : ${car.name}`}
            title={bookNow ? undefined : 'Indiquez vos dates : nous vérifions immédiatement si ce véhicule est libre'}
          >
            {bookNow ? 'Réserver' : 'Vérifier la disponibilité'}
          </button>
        </div>
      </div>

      {showAvail && (
        <AvailabilityModal
          car={car}
          mode="reserve"
          initialColor={selColor}
          onClose={() => setShowAvail(false)}
          /* Booking stays on this page: the popup hands its dates to the side
             panel instead of navigating away. */
          onReserve={({ model, unit, depart, retour, lieu }) => {
            setShowAvail(false)
            setBooking({ car: model, color: unit.color ?? null, depart, retour, lieu })
          }}
        />
      )}

      {booking && (
        <ReserveDrawer
          car={booking.car}
          initialColor={booking.color}
          depart={booking.depart}
          retour={booking.retour}
          lieu={booking.lieu}
          onClose={() => setBooking(null)}
        />
      )}
    </article>
  )
}

/* Holds the place of a card while the cars load. */
export function CarSkeleton() {
  return (
    <div className="car-card car-card--skeleton" aria-hidden="true">
      <div className="car-card__media stage" />
      <div className="car-info">
        <div className="sk-line sk-line--title" />
        <div className="sk-line sk-line--short" />
        <div className="sk-line" />
        <div className="car-footer">
          <div className="sk-line sk-line--price" />
          <div className="sk-line sk-line--btn" />
        </div>
      </div>
    </div>
  )
}
