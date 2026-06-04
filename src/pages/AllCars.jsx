import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { filterOptions, carInCategory } from '../data'
import { fetchCars, mergeByModel } from '../lib/cars'
import CarCard from '../components/CarCard'
import Logo from '../components/Logo'

export default function AllCars() {
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('all')

  useEffect(() => { window.scrollTo(0, 0) }, [])

  useEffect(() => {
    let alive = true
    fetchCars().then(list => { if (alive) { setCars(mergeByModel(list)); setLoading(false) } })
    return () => { alive = false }
  }, [])

  const filtered = activeFilter === 'all'
    ? cars
    : cars.filter(c => carInCategory(c, activeFilter))

  return (
    <div style={{ minHeight: '100vh', background: 'var(--dark)' }}>
      {/* Sticky top nav — sits flush at the very top, outside the padded section */}
      <header className="results-nav">
        <div className="container results-nav__inner">
          <Link to="/" style={{ textDecoration: 'none' }}>
            <Logo size={36} animated={false} />
          </Link>
          <Link to="/" className="btn btn-outline-white btn-sm">← Retour à l'accueil</Link>
        </div>
      </header>

      <section className="section section-dark">
       <div className="container">
        <div className="section-header">
          <div className="section-badge light">Notre Flotte</div>
          <h2 className="section-title light">Toute notre flotte</h2>
          <p className="section-subtitle light">
            {loading ? 'Chargement…' : `${cars.length} véhicule${cars.length > 1 ? 's' : ''} disponible${cars.length > 1 ? 's' : ''} à la location.`}
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

        {filtered.length === 0 ? (
          <p className="section-subtitle light" style={{ textAlign: 'center', padding: '2rem 0' }}>
            Aucun véhicule dans cette catégorie.
          </p>
        ) : (
          <div className="cars-grid">
            {filtered.map(car => <CarCard key={car.id} car={car} />)}
          </div>
        )}
       </div>
      </section>
    </div>
  )
}
