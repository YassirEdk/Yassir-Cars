import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { filterOptions, carInCategory } from '../data'
import { fetchCars, mergeByModel, unitForColor } from '../lib/cars'
import { rateForCar, discountLabel } from '../lib/pricing'
import { SORT_OPTIONS, unitPrice } from '../lib/resultFilters'
import { completeSearch } from '../lib/searchPrefs'
import { glide } from '../lib/glide'
import { useSettings } from '../lib/SettingsContext'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useHideOnScroll } from '../hooks/useHideOnScroll'
import CarCard, { CarSkeleton, openingColor } from '../components/CarCard'
import { SectionTitle } from '../components/SectionHead'
import SelectMenu from '../components/SelectMenu'
import Footer from '../components/Footer'
import { BackHome } from '../components/BackLink'
import Logo from '../components/Logo'
import Icon from '../components/Icon'
import './results.css'
import './fleet.css'

// The agency's own order first.
const SORTS = [{ value: '', label: 'Suggestions' }, ...SORT_OPTIONS]

const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`

export default function AllCars() {
  // Set by the home page's "Voir toute la flotte" button: the section to come
  // back to when leaving this page.
  const backAnchor = useLocation().state?.back ?? null
  const { settings, status } = useSettings()
  useDocumentTitle('Notre flotte — Location de voitures | YASSIR CARS')
  /* Arriving from the promo banner (?promo=1) the page opens on the discounted
     cars only — that is what the visitor clicked for. One button widens it to
     the whole fleet, so the rest of the cars are never hidden away. */
  const [params, setParams] = useSearchParams()
  const [promoOnly, setPromoOnly] = useState(params.get('promo') === '1')
  const [cars, setCars] = useState([])
  const [carsLoading, setCarsLoading] = useState(true)
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState('')
  const barRef = useRef(null)
  const barHidden = useHideOnScroll(barRef, { after: 420 })

  const showAll = () => {
    setPromoOnly(false)
    params.delete('promo')
    setParams(params, { replace: true, state: { keepScroll: true } })
  }

  useEffect(() => {
    let alive = true
    fetchCars()
      .then(list => { if (alive) setCars(mergeByModel(list)) })
      .catch(() => { /* the empty state says so */ })
      .finally(() => { if (alive) setCarsLoading(false) })
    return () => { alive = false }
  }, [])

  // Which cars are discounted is only known once the settings are in.
  const loading = carsLoading || (promoOnly && status === 'loading')

  // A merged model is "en promotion" when any of its units is.
  const hasPromo = (model) =>
    (model.units ?? [model]).some(u => rateForCar(u.id, settings) > 0)
  const promoCars = cars.filter(hasPromo)
  const base = promoOnly ? promoCars : cars

  // The price printed on the card, so the order and the prices always agree.
  const search = completeSearch()
  const shownPrice = (m) =>
    unitPrice(unitForColor(m, openingColor(m, promoOnly, settings), search?.depart, search?.retour), settings)

  const tabs = filterOptions
    .map(o => ({ ...o, count: o.value === 'all' ? base.length : base.filter(c => carInCategory(c, o.value)).length }))
    .filter(o => o.count > 0 || o.value === category)
  const shown = category === 'all' ? [...base] : base.filter(c => carInCategory(c, category))
  if (sort === 'prix-asc') shown.sort((a, b) => shownPrice(a) - shownPrice(b))
  if (sort === 'prix-desc') shown.sort((a, b) => shownPrice(b) - shownPrice(a))
  if (sort === 'nom') shown.sort((a, b) => a.name.localeCompare(b.name, 'fr'))

  const promoRate = discountLabel(rateForCar(promoCars[0]?.units?.find(u => rateForCar(u.id, settings) > 0)?.id, settings))

  return (
    <div className="fleet-page">
      <header className="results-nav results-nav--static">
        <div className="container results-nav__inner">
          <Link to="/" aria-label="YASSIR CARS, accueil"><Logo size={36} /></Link>
          <BackHome anchor={backAnchor} />
        </div>
      </header>

      <main>
        <section className="fleet-head">
          <div className="container fleet-head__inner">
            <div>
              <SectionTitle as="h1">{promoOnly ? (settings.discountTitle || 'Véhicules en promotion') : 'Toute notre flotte'}</SectionTitle>
              <p className="section-subtitle">
                {loading
                  ? 'Chargement des véhicules…'
                  : promoOnly
                    ? `${plural(promoCars.length, 'véhicule')} ${promoRate ? `à ${promoRate}` : 'en promotion'}, remise déjà appliquée aux prix affichés.`
                    : `${plural(cars.length, 'véhicule')} ${cars.length > 1 ? 'disponibles' : 'disponible'} à la location.`}
              </p>
            </div>
            <div className="fleet-head__cars" aria-hidden="true">
              <img src="/cars-fit/Logan.webp" width="720" height="344" alt="" />
              <img src="/cars-fit/508_BLEU.webp" width="720" height="294" alt="" />
              <img src="/cars-fit/Class e.webp" width="720" height="318" alt="" />
            </div>
          </div>
        </section>

        <div className={`results-bar ${barHidden ? 'is-hidden' : ''}`} ref={barRef}>
          <div className="container results-bar__inner">
            <div className="results-cats" role="group" aria-label="Catégorie">
              {tabs.map(o => (
                <button
                  type="button"
                  key={o.value}
                  className={`results-cat-btn ${category === o.value ? 'active' : ''}`}
                  aria-pressed={category === o.value}
                  onClick={() => glide(() => setCategory(o.value))}
                >
                  {o.label} {!loading && <span className="results-cat-btn__n">{o.count}</span>}
                </button>
              ))}
            </div>
            <div className="results-tools">
              <SelectMenu value={sort} onChange={(v) => glide(() => setSort(v))} options={SORTS} ariaLabel="Trier par" />
            </div>
          </div>
        </div>

        <section className="fleet-list" aria-label="Véhicules">
          <div className="container">
            {/* Way back to the complete fleet, so the promo view is a starting
                point rather than a dead end. */}
            {promoOnly && !loading && (
              <div className="promo-only-bar">
                <span className="promo-only-bar__txt">
                  <Icon name="tag" /> Vous voyez uniquement les véhicules en promotion.
                </span>
                <button type="button" className="btn btn-outline btn-sm" onClick={showAll}>
                  Voir toute la flotte <Icon name="arrowRight" className="btn__arrow" />
                </button>
              </div>
            )}

            {loading ? (
              <div className="cars-grid" aria-busy="true">
                {Array.from({ length: 6 }, (_, i) => <CarSkeleton key={i} />)}
              </div>
            ) : shown.length === 0 ? (
              <div className="no-results">
                <div className="no-results__icon"><Icon name="car" /></div>
                <h2>{promoOnly ? 'Aucun véhicule en promotion ici' : 'Aucun véhicule ici pour le moment'}</h2>
                <p>{promoOnly ? 'La promotion ne concerne aucune voiture de cette catégorie.' : 'Choisissez une autre catégorie, ou revenez un peu plus tard.'}</p>
                {promoOnly && (
                  <button type="button" className="btn btn-primary" onClick={showAll}>Voir toute la flotte</button>
                )}
              </div>
            ) : (
              <div className="cars-grid">
                {shown.map((car, i) => <CarCard key={car.id} car={car} preferPromo={promoOnly} index={i} eager={i < 3} />)}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
