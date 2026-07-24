import { useState, useEffect } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { filterOptions, carInCategory } from '../data'
import { fetchCars, mergeByModel } from '../lib/cars'
import { rateForCar, discountLabel } from '../lib/pricing'
import { useSettings } from '../lib/SettingsContext'
import CarCard from '../components/CarCard'
import BackLink from '../components/BackLink'
import Logo from '../components/Logo'
import Icon from '../components/Icon'

export default function AllCars() {
  // Set by the home page's "Voir toute la flotte" button: the section to come
  // back to when leaving this page.
  const backAnchor = useLocation().state?.back ?? null
  const { settings } = useSettings()
  /* Arriving from the promo banner (?promo=1) the page opens on the discounted
     cars only — that is what the visitor clicked for. One button widens it to
     the whole fleet, so the rest of the cars are never hidden away. */
  const [params, setParams] = useSearchParams()
  const [promoOnly, setPromoOnly] = useState(params.get('promo') === '1')
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('all')

  const showAll = () => {
    setPromoOnly(false)
    params.delete('promo')
    setParams(params, { replace: true })
  }

  useEffect(() => { window.scrollTo(0, 0) }, [])

  useEffect(() => {
    let alive = true
    fetchCars().then(list => { if (alive) { setCars(mergeByModel(list)); setLoading(false) } })
    return () => { alive = false }
  }, [])

  // A merged model is "en promotion" when any of its units is.
  const hasPromo = (model) =>
    (model.units ?? [model]).some(u => rateForCar(u.id, settings) > 0)
  const promoCars = cars.filter(hasPromo)

  const base = promoOnly ? promoCars : cars
  const filtered = activeFilter === 'all'
    ? base
    : base.filter(c => carInCategory(c, activeFilter))

  return (
    <div style={{ minHeight: '100vh', background: 'var(--dark)' }}>
      {/* Sticky top nav — sits flush at the very top, outside the padded section */}
      <header className="results-nav">
        <div className="container results-nav__inner">
          <Link to="/" style={{ textDecoration: 'none' }}>
            <Logo size={36} animated={false} />
          </Link>
          <BackLink to="/" anchor={backAnchor} className="btn btn-outline-white btn-sm">← Retour à l'accueil</BackLink>
        </div>
      </header>

      <section className="section section-dark">
       <div className="container">
        <div className="section-header">
          <div className="section-badge light">
            {promoOnly ? (settings.discountTitle || 'Offre Spéciale') : 'Notre Flotte'}
          </div>
          <h2 className="section-title light">
            {promoOnly ? 'Véhicules en promotion' : 'Toute notre flotte'}
          </h2>
          <p className="section-subtitle light">
            {loading
              ? 'Chargement…'
              : promoOnly
                ? `${promoCars.length} véhicule${promoCars.length > 1 ? 's' : ''} ${discountLabel(rateForCar(promoCars[0]?.units?.[0]?.id ?? promoCars[0]?.id, settings)) || 'en promotion'} — remise déjà appliquée aux prix affichés.`
                : `${cars.length} véhicule${cars.length > 1 ? 's' : ''} disponible${cars.length > 1 ? 's' : ''} à la location.`}
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

        {/* Way back to the complete fleet, so the promo view is a starting
            point rather than a dead end. */}
        {promoOnly && !loading && (
          <div className="promo-only-bar">
            <span className="promo-only-bar__txt">
              <Icon name="sparkles" /> Vous voyez uniquement les véhicules en promotion.
            </span>
            <button type="button" className="btn btn-outline-white btn-sm" onClick={showAll}>
              Voir toute la flotte →
            </button>
          </div>
        )}

        {loading ? (
          <div className="cars-grid">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <div className="car-card result-skeleton" key={i} aria-hidden>
                <div className="sk-block" style={{ aspectRatio: '16 / 10' }} />
                <div style={{ padding: '1.25rem' }}>
                  <div className="sk-line sk-line--title" />
                  <div className="sk-line sk-line--short" />
                  <div className="sk-line" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <p className="section-subtitle light">
              {promoOnly
                ? 'Aucun véhicule en promotion dans cette catégorie.'
                : 'Aucun véhicule dans cette catégorie.'}
            </p>
            {promoOnly && (
              <button type="button" className="btn btn-outline-white btn-sm" onClick={showAll}>
                Voir toute la flotte →
              </button>
            )}
          </div>
        ) : (
          <div className="cars-grid">
            {filtered.map(car => <CarCard key={car.id} car={car} preferPromo={promoOnly} />)}
          </div>
        )}
       </div>
      </section>
    </div>
  )
}
