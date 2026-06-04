import { useState } from 'react'
import { effectiveBadge } from '../lib/cars'
import { colorName } from '../data'
import { useScrollReveal } from '../hooks/useScrollReveal'
import AvailabilityModal from './AvailabilityModal'

// cta: 'availability' (default) shows "Vérifier la disponibilité" + popup,
//      'reserve' shows the simple "Réserver" link to the booking form.
export default function CarCard({ car, cta = 'availability' }) {
  const ref = useScrollReveal()
  const [logoFailed, setLogoFailed] = useState(false)
  const [photoFailed, setPhotoFailed] = useState(false)
  const [showAvail, setShowAvail] = useState(false)

  // A merged card carries every physical unit; picking a colour selects the
  // unit, and the whole card (photos, price, specs) follows that unit.
  const units = car.units ?? [car]
  const colors = car.colors ?? (car.color ? [car.color] : [])
  const [selColor, setSelColor] = useState(colors[0] ?? null)
  const active = units.find(u => u.color === selColor) ?? car

  // Photo gallery of the selected unit.
  const gallery = active.photos?.length ? active.photos : (active.photo ? [active.photo] : [])
  const [idx, setIdx] = useState(0)
  const activePhoto = gallery[idx]
  const go = (dir) => (e) => {
    e.preventDefault(); e.stopPropagation()
    setPhotoFailed(false)
    setIdx(i => Math.min(gallery.length - 1, Math.max(0, i + dir)))
  }

  const pickColor = (hex) => (e) => {
    e.preventDefault(); e.stopPropagation()
    setSelColor(hex); setIdx(0); setPhotoFailed(false)
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
          <span>⛽ {active.fuel}</span>
          <span>⚙️ {active.transmission}</span>
          <span>👥 {active.seats} places</span>
          <span>❄️ {active.extra}</span>
        </div>
        <div className="car-footer">
          <div className="car-price">
            <span className="price-old-row">
              <s className="price-old">{active.price.toLocaleString('fr-FR')} {active.currency}</s>
              <span className="price-discount">-30%</span>
            </span>
            <span className="price">{Math.round(active.price * 0.7).toLocaleString('fr-FR')} <small>{active.currency}</small></span>
            <span className="price-period">/ jour</span>
          </div>
          {cta === 'reserve' ? (
            <a href="#reserver" className="btn btn-primary btn-sm">Réserver</a>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => setShowAvail(true)}>
              Vérifier la disponibilité
            </button>
          )}
        </div>
      </div>

      {cta !== 'reserve' && showAvail && <AvailabilityModal car={active} onClose={() => setShowAvail(false)} />}
    </div>
  )
}
