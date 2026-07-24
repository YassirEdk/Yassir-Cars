import { useState, useEffect, useMemo } from 'react'
import { effectiveBadge, isCarAvailable } from '../lib/cars'
import { colorName, featureLabel, featureIcon } from '../data'
import { useScrollReveal } from '../hooks/useScrollReveal'
import AvailabilityModal from './AvailabilityModal'
import ReserveDrawer from './ReserveDrawer'
import Icon from './Icon'
import { useSettings } from '../lib/SettingsContext'
import { discounted, discountLabel, rateForCar } from '../lib/pricing'
import { completeSearch } from '../lib/searchPrefs'

/* Both variants behave the same now: the button books straight away when the
   visitor's search already answers "where and when", and falls back to the
   availability popup otherwise. */
export default function CarCard({ car, preferPromo = false }) {
  const ref = useScrollReveal()
  const { settings } = useSettings()
  const [logoFailed, setLogoFailed] = useState(false)
  const [photoFailed, setPhotoFailed] = useState(false)
  const [showAvail, setShowAvail] = useState(false)
  // Set once the availability popup has the dates: opens the booking panel.
  const [booking, setBooking] = useState(null)

  // A merged card carries every physical unit; picking a colour selects the
  // unit, and the whole card (photos, price, specs) follows that unit.
  const units = car.units ?? [car]
  const colors = car.colors ?? (car.color ? [car.color] : [])
  /* On the promotion view, open on a colour that actually carries the discount
     — otherwise a card could land on its one non-discounted colour and look
     like it doesn't belong in the list. */
  const [selColor, setSelColor] = useState(() => {
    if (preferPromo) {
      const discounted = units.find(u => rateForCar(u.id, settings) > 0)
      if (discounted?.color) return discounted.color
    }
    return colors[0] ?? null
  })
  const active = units.find(u => u.color === selColor) ?? car

  // Photo gallery of the selected unit.
  const gallery = useMemo(
    () => active.photos?.length ? active.photos : (active.photo ? [active.photo] : []),
    [active]
  )
  const [idx, setIdx] = useState(0)
  const activePhoto = gallery[idx]

  // Promotion follows the selected colour/unit.
  const promoRate = rateForCar(active.id, settings)
  const promoLabel = discountLabel(promoRate)

  // Preload the unit's other photos so flipping through the gallery is instant.
  // Without this, photos 2 and 3 only start downloading when the arrow is
  // clicked, so they visibly pop in a moment later (most noticeable on a first
  // visit with a cold cache). Scheduled at idle time so it never competes with
  // the cover image's initial load.
  useEffect(() => {
    if (gallery.length < 2) return
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 300))
    const cancelIdle = window.cancelIdleCallback || clearTimeout
    const handle = idle(() => {
      for (const src of gallery) { const img = new Image(); img.src = src }
    })
    return () => cancelIdle(handle)
  }, [gallery])
  const go = (dir) => (e) => {
    e.preventDefault(); e.stopPropagation()
    setPhotoFailed(false)
    setIdx(i => Math.min(gallery.length - 1, Math.max(0, i + dir)))
  }

  const pickColor = (hex) => (e) => {
    e.preventDefault(); e.stopPropagation()
    setSelColor(hex); setIdx(0); setPhotoFailed(false)
  }

  /* The visitor has already told the search bar where and when, so the card
     doesn't ask a second time: it opens the booking panel straight away on the
     colour they are looking at. Only when there is no usable search — or the
     car is taken for those dates — does the availability popup appear, since
     that is where the alternatives live. */
  const ready = completeSearch()
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
    blue: 'car-badge badge-blue',
    gold: 'car-badge badge-gold',
  }[active.badgeColor] ?? 'car-badge'

  return (
    <div className="car-card" ref={ref}>
      {badge && <span className={badgeClass}>{badge}</span>}

      <div className="car-img-wrap" style={{ background: activePhoto && !photoFailed ? '#f4f5f7' : active.brandColor }}>
        {activePhoto && !photoFailed ? (
          <img
            key={activePhoto}
            src={activePhoto}
            alt={car.name}
            className="car-photo"
            loading="lazy"
            decoding="async"
            onError={() => setPhotoFailed(true)}
          />
        ) : active.brandLogo && !logoFailed ? (
          <img
            src={active.brandLogo}
            alt={car.name}
            className="car-brand-logo"
            style={active.whiteFilter ? { filter: 'brightness(0) invert(1)' } : {}}
            loading="lazy"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <span className="car-brand-initial">{car.name.split(' ')[0]}</span>
        )}

        {gallery.length > 1 && (
          <>
            {idx > 0 && (
              <button type="button" className="gallery-nav gallery-nav--prev" onClick={go(-1)} aria-label="Photo précédente">‹</button>
            )}
            {idx < gallery.length - 1 && (
              <button type="button" className="gallery-nav gallery-nav--next" onClick={go(1)} aria-label="Photo suivante">›</button>
            )}
            <div className="gallery-dots">
              {gallery.map((_, i) => <span key={i} className={i === idx ? 'active' : ''} />)}
            </div>
          </>
        )}
      </div>

      <div className="car-info">
        <div className="car-header">
          <h3>{car.name}</h3>
          <span className="car-category">{car.category.charAt(0).toUpperCase() + car.category.slice(1)}</span>
        </div>

        {colors.length > 0 && (
          <div className="car-colors">
            {colors.map(hex => (
              <button
                type="button"
                key={hex}
                className={`car-color-dot ${hex === selColor ? 'active' : ''}`}
                style={{ background: hex }}
                title={colorName(hex)}
                onClick={pickColor(hex)}
                aria-label={`Couleur ${colorName(hex)}`}
              />
            ))}
            {selColor && <span className="car-colors__label">{colorName(selColor)}</span>}
          </div>
        )}

        <div className="car-specs">
          <span><Icon name="fuel" /> {active.fuel}</span>
          <span><Icon name="gear" /> {active.transmission}</span>
          <span><Icon name="users" /> {active.seats} places</span>
        </div>
        {active.features?.length > 0 && (
          <div className="car-equip">
            {active.features.slice(0, 6).map(f => (
              <span className="equip-pill" key={f} title={featureLabel(f)}>
                <Icon name={featureIcon(f)} className="equip-pill__icon" /> {featureLabel(f)}
              </span>
            ))}
            {active.features.length > 6 && (
              <span className="equip-pill equip-pill--more">+{active.features.length - 6}</span>
            )}
          </div>
        )}
        <div className="car-footer">
          <div className="car-price">
            {promoLabel && (
              <span className="price-old-row">
                <s className="price-old">{active.price.toLocaleString('fr-FR')} {active.currency}</s>
                <span className="price-discount">{promoLabel}</span>
              </span>
            )}
            <span className="price">{discounted(active.price, promoRate).toLocaleString('fr-FR')} <small>{active.currency}</small></span>
            <span className="price-period">/ jour</span>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={openBooking}
            title="Indiquez vos dates : nous vérifions immédiatement si ce véhicule est libre"
          >
            Vérifier la disponibilité
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
    </div>
  )
}
