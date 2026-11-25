import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchCars, mergeByModel } from '../lib/cars'
import { filterOptions, carInCategory } from '../data'
import { glide } from '../lib/glide'
import CarCard, { CarSkeleton } from './CarCard'
import Icon from './Icon'
import SectionHead from './SectionHead'

// Cards in the teaser. Phones show the first four (carcard.css).
const TEASER = 6

export default function Fleet() {
  const [models, setModels] = useState(null)          // null while they load
  const [category, setCategory] = useState('all')

  useEffect(() => {
    let alive = true
    fetchCars()
      .then(list => { if (alive) setModels(mergeByModel(list)) })
      .catch(() => { if (alive) setModels([]) })
    return () => { alive = false }
  }, [])

  // Only the categories that have cars.
  const tabs = filterOptions.filter(o => o.value === 'all' || models?.some(m => carInCategory(m, o.value)))
  const shown = (models ?? [])
    .filter(m => category === 'all' || carInCategory(m, category))
    .sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0))   // newest first
    .slice(0, TEASER)

  return (
    <section className="section fleet" id="flotte">
      <div className="container">
        <SectionHead
          title="Des véhicules pour chaque besoin"
          text="Choisissez parmi notre large sélection de véhicules récents et parfaitement entretenus."
        />

        {/* Its place is kept while the cars load, so nothing jumps. */}
        {(!models || tabs.length > 2) && (
          <div className="filter-tabs" role="group" aria-label="Catégorie">
            {tabs.map(o => (
              <button
                type="button"
                key={o.value}
                className={`filter-btn ${category === o.value ? 'active' : ''}`}
                aria-pressed={category === o.value}
                onClick={() => glide(() => setCategory(o.value))}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}

        <div className="cars-grid cars-grid--teaser" aria-busy={!models}>
          {models
            ? shown.map((car, i) => <CarCard key={car.id} car={car} index={i} />)
            : Array.from({ length: TEASER }, (_, i) => <CarSkeleton key={i} />)}
        </div>

        <div className="flotte-cta">
          {/* `back` travels with the visitor: the fleet page's "Retour à
              l'accueil" then returns to this very section, not to the top. */}
          <Link to="/flotte" state={{ back: 'flotte' }} className="btn btn-outline">
            Voir toute la flotte <Icon name="arrowRight" className="btn__arrow" />
          </Link>
        </div>
      </div>
    </section>
  )
}
