import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchCars, mergeByModel } from '../lib/cars'
import CarCard from './CarCard'

export default function Fleet() {
  const [cars, setCars] = useState([])

  useEffect(() => {
    let alive = true
    fetchCars().then(list => { if (alive) setCars(list) })
    return () => { alive = false }
  }, [])

  // Home teaser: merge units into models, then show the 6 newest models.
  const latest = mergeByModel(cars)
    .sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0))
    .slice(0, 6)

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

        <div className="cars-grid">
          {latest.map(car => <CarCard key={car.id} car={car} />)}
        </div>

        <div className="flotte-cta">
          {/* `back` travels with the visitor: the fleet page's "Retour à
              l'accueil" then returns to this very section, not to the top. */}
          <Link to="/flotte" state={{ back: 'flotte' }} className="btn btn-outline-white">
            Voir toute la flotte →
          </Link>
        </div>
      </div>
    </section>
  )
}
