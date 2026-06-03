import { useState } from 'react'
import { cars, filterOptions, carInCategory } from '../data'
import { useScrollReveal } from '../hooks/useScrollReveal'

function CarCard({ car }) {
  const ref = useScrollReveal()
  const [logoFailed, setLogoFailed] = useState(false)
  const [photoFailed, setPhotoFailed] = useState(false)

  const badgeClass = {
    red: 'car-badge',
    blue: 'car-badge badge-blue',
    gold: 'car-badge badge-gold',
  }[car.badgeColor] ?? 'car-badge'

  return (
    <div className="car-card" ref={ref}>
      {car.badge && <span className={badgeClass}>{car.badge}</span>}

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
          <a href="#reserver" className="btn btn-primary btn-sm">Réserver</a>
        </div>
      </div>
    </div>
  )
}

export default function Fleet() {
  const [activeFilter, setActiveFilter] = useState('all')

  const filtered = activeFilter === 'all'
    ? cars
    : cars.filter(c => carInCategory(c, activeFilter))

  return (
    <section className="section section-dark" id="flotte">
      <div className="container">
        <div className="section-header">
          <div className="section-badge light">Notre Flotte</div>
          <h2 className="section-title light">Des véhicules pour chaque besoin</h2>
          <p className="section-subtitle light">
            Choisissez parmi notre large sélection de véhicules récents et parfaitement entretenus.
          </p>
        </div>

        <div className="filter-tabs">
          {filterOptions.map(opt => (
            <button
              key={opt.value}
              className={`filter-btn ${activeFilter === opt.value ? 'active' : ''}`}
              onClick={() => setActiveFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="cars-grid">
          {filtered.map(car => <CarCard key={car.id} car={car} />)}
        </div>

        <div className="flotte-cta">
          <a href="#contact" className="btn btn-outline-white">Voir toute la flotte (50+ véhicules) →</a>
        </div>
      </div>
    </section>
  )
}
