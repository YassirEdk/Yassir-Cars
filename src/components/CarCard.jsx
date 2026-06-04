import { useState } from 'react'
import { effectiveBadge } from '../lib/cars'
import { useScrollReveal } from '../hooks/useScrollReveal'
import AvailabilityModal from './AvailabilityModal'

// cta: 'availability' (default) shows "Vérifier la disponibilité" + popup,
//      'reserve' shows the simple "Réserver" link to the booking form.
export default function CarCard({ car, cta = 'availability' }) {
  const ref = useScrollReveal()
  const [logoFailed, setLogoFailed] = useState(false)
  const [photoFailed, setPhotoFailed] = useState(false)
  const [showAvail, setShowAvail] = useState(false)

  // Photo gallery: cycle through all photos with the arrows.
  const gallery = car.photos?.length ? car.photos : (car.photo ? [car.photo] : [])
  const [idx, setIdx] = useState(0)
  const activePhoto = gallery[idx]
  const go = (dir) => (e) => {
    e.preventDefault(); e.stopPropagation()
    setPhotoFailed(false)
    setIdx(i => Math.min(gallery.length - 1, Math.max(0, i + dir)))
  }

  const badge = effectiveBadge(car)
  const badgeClass = {
    red: 'car-badge',
    blue: 'car-badge badge-blue',
    gold: 'car-badge badge-gold',
  }[car.badgeColor] ?? 'car-badge'

  return (
    <div className="car-card" ref={ref}>
      {badge && <span className={badgeClass}>{badge}</span>}

      <div className="car-img-wrap" style={{ background: activePhoto && !photoFailed ? '#f4f5f7' : car.brandColor }}>
        {activePhoto && !photoFailed ? (
          <img
            key={activePhoto}
            src={activePhoto}
            alt={car.name}
            className="car-photo"
            loading="lazy"
            onError={() => setPhotoFailed(true)}
          />
        ) : car.brandLogo && !logoFailed ? (
          <img
            src={car.brandLogo}
            alt={car.name}
            className="car-brand-logo"
            style={car.whiteFilter ? { filter: 'brightness(0) invert(1)' } : {}}
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
        <div className="car-specs">
          <span>⛽ {car.fuel}</span>
          <span>⚙️ {car.transmission}</span>
          <span>👥 {car.seats} places</span>
          <span>❄️ {car.extra}</span>
        </div>
        <div className="car-footer">
          <div className="car-price">
            <span className="price-old-row">
              <s className="price-old">{car.price.toLocaleString('fr-FR')} {car.currency}</s>
              <span className="price-discount">-30%</span>
            </span>
            <span className="price">{Math.round(car.price * 0.7).toLocaleString('fr-FR')} <small>{car.currency}</small></span>
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

      {cta !== 'reserve' && showAvail && <AvailabilityModal car={car} onClose={() => setShowAvail(false)} />}
    </div>
  )
}
