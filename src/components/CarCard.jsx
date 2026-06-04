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

  const badge = effectiveBadge(car)
  const badgeClass = {
    red: 'car-badge',
    blue: 'car-badge badge-blue',
    gold: 'car-badge badge-gold',
  }[car.badgeColor] ?? 'car-badge'

  return (
    <div className="car-card" ref={ref}>
      {badge && <span className={badgeClass}>{badge}</span>}

      <div className="car-img-wrap" style={{ background: car.photo && !photoFailed ? '#f4f5f7' : car.brandColor }}>
        {car.photo && !photoFailed ? (
          <img
            src={car.photo}
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
