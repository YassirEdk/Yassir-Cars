import { useState, useMemo, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { carInCategory, colorName } from '../data'
import { fetchCars, mergeByModel, isModelAvailable, effectiveBadge } from '../lib/cars'
import Logo from '../components/Logo'

function daysBetween(d1, d2) {
  if (!d1) return 1
  if (!d2) return 1
  const diff = new Date(d2) - new Date(d1)
  return Math.max(1, Math.ceil(diff / 86_400_000))
}

function fmt(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

const CATEGORIES = ['Toutes catégories', 'Économique', 'Citadine', 'Berline', 'SUV / 4x4', 'Luxe', 'Utilitaire']
const SORT_OPTIONS = [
  { value: 'prix-asc',  label: 'Prix croissant' },
  { value: 'prix-desc', label: 'Prix décroissant' },
  { value: 'nom',       label: 'Nom A→Z' },
]

/* ── Mini search bar at the top of results ── */
function MiniSearch({ params, onSearch }) {
  const [form, setForm] = useState({
    lieu:      params.get('lieu')      || '',
    depart:    params.get('depart')    || '',
    retour:    params.get('retour')    || '',
    categorie: params.get('categorie') || '',
  })
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = e => {
    e.preventDefault()
    onSearch(form)
  }

  return (
    <div className="mini-search">
      <div className="container">
        <form className="mini-search-form" onSubmit={handleSubmit}>
          <div className="mini-field">
            <label>📍 Lieu</label>
            <input type="text" placeholder="Casablanca..." value={form.lieu} onChange={set('lieu')} />
          </div>
          <div className="mini-field">
            <label>📅 Départ</label>
            <input type="date" value={form.depart} onChange={set('depart')} />
          </div>
          <div className="mini-field">
            <label>📅 Retour</label>
            <input type="date" value={form.retour} onChange={set('retour')} />
          </div>
          <div className="mini-field">
            <label>🚘 Catégorie</label>
            <select value={form.categorie} onChange={set('categorie')}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <button type="submit" className="btn btn-accent">Relancer →</button>
        </form>
      </div>
    </div>
  )
}

/* ── Phone modal ── */
function PhoneModal({ car, onClose }) {
  const overlayRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      className="phone-overlay"
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="phone-modal">
        <button className="phone-modal__close" onClick={onClose} aria-label="Fermer">✕</button>

        <div className="phone-modal__icon">📞</div>
        <h3 className="phone-modal__title">Contacter l'agence</h3>
        <p className="phone-modal__car">Pour réserver la <strong>{car.name}</strong></p>

        <div className="phone-modal__numbers">
          <span className="phone-modal__btn phone-modal__btn--disabled">
            <span className="phone-modal__btn-icon">📞</span>
            <div>
              <span className="phone-modal__btn-label">Appel standard</span>
              <span className="phone-modal__btn-num">+212 522 000 000</span>
            </div>
          </span>

          <a
            href="https://wa.me/212661000000"
            target="_blank"
            rel="noopener noreferrer"
            className="phone-modal__btn phone-modal__btn--whatsapp"
          >
            <span className="phone-modal__btn-icon">💬</span>
            <div>
              <span className="phone-modal__btn-label">WhatsApp</span>
              <span className="phone-modal__btn-num">+212 661 000 000</span>
            </div>
          </a>
        </div>

        <p className="phone-modal__hours">⏰ Disponible Lun–Sam 8h–20h · Dim 9h–18h</p>
        <button className="phone-modal__cancel" onClick={onClose}>Annuler</button>
      </div>
    </div>
  )
}

/* ── Individual result card ── */
function ResultCard({ car, days, available, onCall }) {
  const [logoFailed, setLogoFailed] = useState(false)
  const [photoFailed, setPhotoFailed] = useState(false)
  // Pick a colour → switch to that unit (photos, price, specs follow it).
  const units = car.units ?? [car]
  const colors = car.colors ?? (car.color ? [car.color] : [])
  const [selColor, setSelColor] = useState(colors[0] ?? null)
  const active = units.find(u => u.color === selColor) ?? car

  const gallery = active.photos?.length ? active.photos : (active.photo ? [active.photo] : [])
  const [activePhoto, setActivePhoto] = useState(gallery[0] || active.photo)
  const shownPhoto = gallery.includes(activePhoto) ? activePhoto : (gallery[0] || active.photo)
  const curIdx = Math.max(0, gallery.indexOf(shownPhoto))
  const goPhoto = (dir) => (e) => {
    e.preventDefault(); e.stopPropagation()
    const next = Math.min(gallery.length - 1, Math.max(0, curIdx + dir))
    setActivePhoto(gallery[next])
    setPhotoFailed(false)
  }
  const pickColor = (hex) => (e) => {
    e.preventDefault(); e.stopPropagation()
    const unit = units.find(u => u.color === hex) ?? car
    const g = unit.photos?.length ? unit.photos : (unit.photo ? [unit.photo] : [])
    setSelColor(hex); setActivePhoto(g[0] || unit.photo); setPhotoFailed(false)
  }
  const promoPrice = Math.round(active.price * 0.7) // -30%
  const total = promoPrice * days
  const oldTotal = active.price * days

  return (
    <div className={`result-card ${available ? '' : 'result-card--unavailable'}`}>
      <div className="result-card__img" style={{ background: shownPhoto && !photoFailed ? '#fff' : active.brandColor }}>
        {shownPhoto && !photoFailed ? (
          <img
            key={shownPhoto}
            src={shownPhoto}
            alt={car.name}
            className="result-photo"
            loading="lazy"
            onError={() => setPhotoFailed(true)}
          />
        ) : active.brandLogo && !logoFailed ? (
          <img
            src={active.brandLogo}
            alt={car.name}
            className="result-brand-logo"
            style={active.whiteFilter ? { filter: 'brightness(0) invert(1)' } : {}}
            loading="lazy"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <span className="result-brand-initial">{car.name.split(' ')[0]}</span>
        )}
        {effectiveBadge(active) && (
          <span className={`result-badge result-badge--${active.badgeColor}`}>{effectiveBadge(active)}</span>
        )}
        <span className={`avail-tag ${available ? 'avail-tag--ok' : 'avail-tag--no'}`}>
          {available ? '✅ Disponible' : '❌ Non disponible'}
        </span>

        {gallery.length > 1 && (
          <>
            {curIdx > 0 && (
              <button type="button" className="gallery-nav gallery-nav--prev" onClick={goPhoto(-1)} aria-label="Photo précédente">‹</button>
            )}
            {curIdx < gallery.length - 1 && (
              <button type="button" className="gallery-nav gallery-nav--next" onClick={goPhoto(1)} aria-label="Photo suivante">›</button>
            )}
          </>
        )}

        {gallery.length > 1 && (
          <div className="result-thumbs">
            {gallery.slice(0, 5).map((url) => (
              <button
                key={url}
                type="button"
                className={`result-thumb ${url === shownPhoto ? 'active' : ''}`}
                onMouseEnter={() => { setActivePhoto(url); setPhotoFailed(false) }}
                onClick={() => { setActivePhoto(url); setPhotoFailed(false) }}
              >
                <img src={url} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="result-card__body">
        <div className="result-card__top">
          <div>
            <h3 className="result-card__name">{car.name}</h3>
            <span className="result-card__cat">{car.category}</span>
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
          </div>
          <div className="result-card__pricing">
            <div className="result-price-old-row">
              <span className="result-price-old">{active.price.toLocaleString('fr-FR')} MAD</span>
              <span className="result-discount">-30%</span>
            </div>
            <div className="result-card__day">
              <span className="result-price">{promoPrice.toLocaleString('fr-FR')}</span>
              <span className="result-currency"> MAD</span>
              <span className="result-per"> / jour</span>
            </div>
            {days > 1 && (
              <div className="result-total">
                Total : <strong>{total.toLocaleString('fr-FR')} MAD</strong>
                <s className="result-total-old">{oldTotal.toLocaleString('fr-FR')} MAD</s>
                <small> ({days} jours)</small>
              </div>
            )}
          </div>
        </div>

        <div className="result-card__specs">
          <span>⛽ {active.fuel}</span>
          <span>⚙️ {active.transmission}</span>
          <span>👥 {active.seats} places</span>
          <span>❄️ {active.extra}</span>
        </div>

        <div className="result-card__features">
          <span className="feature-pill">✓ Kilométrage illimité</span>
          <span className="feature-pill">✓ Assurance incluse</span>
          <span className="feature-pill">✓ Assistance 24h/24</span>
        </div>

        <div className="result-card__footer">
          {available ? (
            <span className="result-reserve">
              Réserver maintenant <span className="result-reserve__arrow">→</span>
            </span>
          ) : (
            <span className="result-unavailable-label">❌ Indisponible pour ces dates</span>
          )}
          <button className="result-phone" onClick={() => onCall(car)}>
            📞 Appeler
          </button>
        </div>
      </div>
    </div>
  )
}

/* Map a URL categorie string (with accents, spaces) → internal category key */
function urlCatToKey(cat) {
  if (!cat || cat === 'Toutes catégories') return 'all'
  const s = cat.toLowerCase()
  if (s.includes('conomique'))  return 'economique'  // handles "Économique" / "economique"
  if (s.includes('berline'))    return 'berline'
  if (s.includes('suv') || s.includes('4x4')) return 'suv'
  if (s.includes('luxe'))       return 'luxe'
  if (s.includes('citadine'))   return 'citadine'
  if (s.includes('utilitaire')) return 'utilitaire'
  return 'all'
}

/* ── Page ── */
export default function SearchResults() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const lieu    = searchParams.get('lieu')      || ''
  const depart  = searchParams.get('depart')    || ''
  const retour  = searchParams.get('retour')    || ''
  const catParam = searchParams.get('categorie') || ''
  const carId   = searchParams.get('car')       || ''  // single-car mode

  const [sort,        setSort]        = useState('prix-asc')
  const [filterDispo, setFilterDispo] = useState(false)
  const [filterCat,   setFilterCat]   = useState(() => urlCatToKey(catParam))
  const [callingCar,  setCallingCar]  = useState(null)

  const days = daysBetween(depart, retour)

  const [cars, setCars] = useState([])
  useEffect(() => {
    let alive = true
    fetchCars().then(list => { if (alive) setCars(list) })
    return () => { alive = false }
  }, [])

  // Merge units into models, then compute availability per model (free if any
  // unit is free). When ?car=<id> is present, narrow to the model that unit
  // belongs to.
  const baseList = useMemo(() => {
    const models = mergeByModel(cars)
    const source = carId
      ? models.filter(m => String(m.id) === String(carId) || (m.units ?? []).some(u => String(u.id) === String(carId)))
      : models
    return source.map(model => ({ ...model, available: isModelAvailable(model, depart, retour) }))
  }, [cars, carId, depart, retour])

  const ALL_TABS = [
    { value: 'economique', label: 'Économique' },
    { value: 'citadine',   label: 'Citadine'   },
    { value: 'berline',    label: 'Berline'    },
    { value: 'suv',        label: 'SUV / 4x4'  },
    { value: 'luxe',       label: 'Luxe'       },
  ]

  // Source for tab counts: respect filterDispo so counts stay honest
  const countBase = useMemo(
    () => filterDispo ? baseList.filter(c => c.available) : baseList,
    [baseList, filterDispo]
  )

  // Only show tabs that have at least one car in countBase
  const visibleTabs = ALL_TABS.filter(
    t => countBase.some(c => carInCategory(c, t.value))
  )

  // Final results: apply category tab + dispo + sort on top of baseList
  const results = useMemo(() => {
    let list = [...baseList]

    if (filterCat !== 'all') {
      list = list.filter(c => carInCategory(c, filterCat))
    }

    if (filterDispo) list = list.filter(c => c.available)

    if (sort === 'prix-asc')  list.sort((a, b) => a.price - b.price)
    if (sort === 'prix-desc') list.sort((a, b) => b.price - a.price)
    if (sort === 'nom')       list.sort((a, b) => a.name.localeCompare(b.name))

    list.sort((a, b) => (b.available ? 1 : 0) - (a.available ? 1 : 0))

    return list
  }, [baseList, filterCat, filterDispo, sort])

  const availableCount = results.filter(c => c.available).length

  const handleNewSearch = (form) => {
    const params = new URLSearchParams()
    if (form.lieu)   params.set('lieu',   form.lieu)
    if (form.depart) params.set('depart', form.depart)
    if (form.retour) params.set('retour', form.retour)
    if (form.categorie && form.categorie !== CATEGORIES[0])
      params.set('categorie', form.categorie)
    // navigate instead of setSearchParams so the component remounts
    // and all state (filterCat, sort, etc.) resets from the new URL
    navigate(`/resultats?${params.toString()}`, { replace: true })
  }

  return (
    <div className="results-page">
      {/* Top nav */}
      <header className="results-nav">
        <div className="container results-nav__inner">
          <Link to="/" style={{ textDecoration: 'none' }}>
            <Logo size={36} animated={false} />
          </Link>
          <Link to="/" className="btn btn-outline-white btn-sm">← Retour à l'accueil</Link>
        </div>
      </header>

      {/* Mini search bar */}
      <MiniSearch params={searchParams} onSearch={handleNewSearch} />

      {/* Summary banner */}
      <div className="results-summary">
        <div className="container results-summary__inner">
          <div className="results-summary__text">
            <h2>
              <span className="results-count">{availableCount}</span> voiture{availableCount > 1 ? 's' : ''} disponible{availableCount > 1 ? 's' : ''}
            </h2>
            <p>
              {lieu && <><strong>{lieu}</strong> · </>}
              {depart && <>Du <strong>{fmt(depart)}</strong></>}
              {retour && <> au <strong>{fmt(retour)}</strong></>}
              {days > 1 && <> · <strong>{days} jours</strong></>}
            </p>
          </div>
          <div className="results-summary__meta">
            <span>🔄 Annulation gratuite</span>
            <span>🛡️ Assurance incluse</span>
            <span>📞 Support 24h/24</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="results-toolbar">
        <div className="container results-toolbar__inner">
          {/* Category tabs — only show tabs that have cars */}
          <div className="results-cats">
            <button
              className={`results-cat-btn ${filterCat === 'all' ? 'active' : ''}`}
              onClick={() => setFilterCat('all')}
            >
              Tous ({countBase.length})
            </button>
            {visibleTabs.map(opt => {
              const count = countBase.filter(c => carInCategory(c, opt.value)).length
              return (
                <button
                  key={opt.value}
                  className={`results-cat-btn ${filterCat === opt.value ? 'active' : ''}`}
                  onClick={() => setFilterCat(opt.value)}
                >
                  {opt.label} ({count})
                </button>
              )
            })}
          </div>

          <div className="results-toolbar__right">
            {/* Dispo filter */}
            <label className="dispo-toggle">
              <input
                type="checkbox"
                checked={filterDispo}
                onChange={e => {
                  const next = e.target.checked
                  setFilterDispo(next)
                  // if active tab would have 0 cars after toggling, reset to Tous
                  if (filterCat !== 'all') {
                    const nextBase = next ? baseList.filter(c => c.available) : baseList
                    const stillHasCars = nextBase.some(c => carInCategory(c, filterCat))
                    if (!stillHasCars) setFilterCat('all')
                  }
                }}
              />
              <span>Disponibles seulement</span>
            </label>

            {/* Sort */}
            <div className="sort-wrap">
              <span className="sort-label">Trier par</span>
              <select
                className="sort-select"
                value={sort}
                onChange={e => setSort(e.target.value)}
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Results grid */}
      <div className="results-body">
        <div className="container">
          {results.length === 0 ? (
            <div className="no-results">
              <div className="no-results__icon">😔</div>
              <h3>Aucun véhicule trouvé</h3>
              <p>Essayez de modifier vos dates ou votre catégorie.</p>
              <Link to="/" className="btn btn-primary">Nouvelle recherche</Link>
            </div>
          ) : (
            <div className="result-list">
              {results.map(car => (
                <ResultCard key={car.id} car={car} days={days} available={car.available} onCall={setCallingCar} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Phone modal */}
      {callingCar && (
        <PhoneModal car={callingCar} onClose={() => setCallingCar(null)} />
      )}

      {/* Footer strip */}
      <div className="results-footer-strip">
        <div className="container">
          <p>© 2026 YASSIR CARS · <a href="tel:+212522000000">+212 522 000 000</a> · contact@yassir-cars.ma</p>
        </div>
      </div>
    </div>
  )
}
