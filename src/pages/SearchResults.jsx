import { useState, useMemo, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { carInCategory, colorName, moroccanCities, addDays, featureLabel, featureIcon } from '../data'
import { useSettings } from '../lib/SettingsContext'
import { useCurrency } from '../lib/CurrencyContext'
import { CURRENCIES, CURRENCY_CODES, convert, formatMoney } from '../lib/currency'
import SelectMenu from '../components/SelectMenu'
import { fetchCars, mergeByModel, isModelAvailable, isCarAvailable, effectiveBadge } from '../lib/cars'
import Logo from '../components/Logo'
import CityWheel from '../components/CityWheel'
import DatePicker from '../components/DatePicker'
import Icon from '../components/Icon'

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

// International digits → readable phone: "212661234567" → "+212 661 234 567".
function formatPhone(digits) {
  const s = String(digits || '').replace(/\D/g, '')
  if (!s) return ''
  const cc = s.slice(0, 3)
  const rest = s.slice(3).replace(/(\d{3})(?=\d)/g, '$1 ')
  return `+${cc} ${rest}`.trim()
}

const CATEGORIES = ['Toutes catégories', 'Économique', 'Citadine', 'Berline', 'SUV / 4x4', 'Luxe', 'Utilitaire']
const SORT_OPTIONS = [
  { value: 'prix-asc',  label: 'Prix croissant' },
  { value: 'prix-desc', label: 'Prix décroissant' },
  { value: 'nom',       label: 'Nom A→Z' },
]

/* ── Mini search bar at the top of results ── */
function MiniSearch({ params, onSearch }) {
  const { settings } = useSettings()
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
            <CityWheel
              value={form.lieu}
              onChange={(city) => setForm(f => ({ ...f, lieu: city }))}
              cities={moroccanCities}
            />
          </div>
          <div className="mini-field">
            <label>📅 Départ</label>
            <DatePicker
              value={form.depart}
              onChange={(iso) => setForm(f => ({ ...f, depart: iso }))}
              placeholder="Choisir une date"
              className="mini-datepicker"
            />
          </div>
          <div className="mini-field">
            <label>📅 Retour</label>
            <DatePicker
              value={form.retour}
              onChange={(iso) => setForm(f => ({ ...f, retour: iso }))}
              min={form.depart ? addDays(form.depart, settings.minRentalDays) : undefined}
              placeholder="Choisir une date"
              className="mini-datepicker"
            />
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
  const { settings } = useSettings()

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
            href={`https://wa.me/${settings.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="phone-modal__btn phone-modal__btn--whatsapp"
          >
            <span className="phone-modal__btn-icon">💬</span>
            <div>
              <span className="phone-modal__btn-label">WhatsApp</span>
              <span className="phone-modal__btn-num">{formatPhone(settings.whatsapp)}</span>
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
function ResultCard({ car, days, available, depart, retour, lieu, availableOnly, onCall }) {
  const { currency } = useCurrency()
  const [logoFailed, setLogoFailed] = useState(false)
  const [photoFailed, setPhotoFailed] = useState(false)
  // Pick a colour → switch to that unit (photos, price, specs follow it).
  const allUnits = car.units ?? [car]
  const allColors = car.colors ?? (car.color ? [car.color] : [])
  const unitFree = (u) => !u || isCarAvailable(u, depart, retour)
  const colorFree = (hex) => unitFree(allUnits.find(u => u.color === hex))
  // "Disponibles seulement" → drop the colours/units reserved for the dates.
  const units = availableOnly ? allUnits.filter(unitFree) : allUnits
  const colors = availableOnly ? allColors.filter(colorFree) : allColors
  // Default to a colour that's actually free for the chosen dates.
  const firstFreeColor = (units.find(unitFree) ?? units[0])?.color ?? colors[0] ?? null
  const [selColor, setSelColor] = useState(firstFreeColor)
  // Keep the selection valid when the visible colour set changes (filter toggle).
  const effColor = colors.includes(selColor) ? selColor : (colors[0] ?? selColor)
  const active = allUnits.find(u => u.color === effColor) ?? car
  // The tag reflects the SELECTED unit, not the whole model.
  const activeAvailable = unitFree(active)

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
    <div className={`result-card ${activeAvailable ? '' : 'result-card--unavailable'}`}>
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
        <span className={`avail-tag ${activeAvailable ? 'avail-tag--ok' : 'avail-tag--no'}`}>
          {activeAvailable ? '✅ Disponible' : '❌ Non disponible'}
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
                    className={`car-color-dot ${hex === effColor ? 'active' : ''} ${depart && !colorFree(hex) ? 'taken' : ''}`}
                    style={{ background: hex }}
                    title={`${colorName(hex)}${depart && !colorFree(hex) ? ' — réservé' : ''}`}
                    onClick={pickColor(hex)}
                    aria-label={`Couleur ${colorName(hex)}`}
                  />
                ))}
                {effColor && (
                  <span className="car-colors__label">
                    {colorName(effColor)}{!activeAvailable ? ' — réservé' : ''}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="result-card__pricing">
            <div className="result-price-old-row">
              <span className="result-price-old">{formatMoney(active.price, currency)}</span>
              <span className="result-discount">-30%</span>
            </div>
            <div className="result-card__day">
              <span className="result-price">{convert(promoPrice, currency).toLocaleString('fr-FR')}</span>
              <span className="result-currency"> {CURRENCIES[currency].symbol}</span>
              <span className="result-per"> / jour</span>
            </div>
            {days > 1 && (
              <div className="result-total">
                Total : <strong>{formatMoney(total, currency)}</strong>
                <s className="result-total-old">{formatMoney(oldTotal, currency)}</s>
                <small> ({days} jours)</small>
              </div>
            )}
          </div>
        </div>

        <div className="result-card__specs">
          <span><Icon name="fuel" /> {active.fuel}</span>
          <span><Icon name="gear" /> {active.transmission}</span>
          <span><Icon name="users" /> {active.seats} places</span>
        </div>

        {active.features?.length > 0 && (
          <div className="result-card__equip">
            {active.features.map(f => (
              <span className="equip-pill" key={f}>
                <Icon name={featureIcon(f)} className="equip-pill__icon" /> {featureLabel(f)}
              </span>
            ))}
          </div>
        )}

        <div className="result-card__features">
          <span className="feature-pill">✓ Kilométrage illimité</span>
          <span className="feature-pill">✓ Assurance incluse</span>
          <span className="feature-pill">✓ Assistance 24h/24</span>
        </div>

        <div className="result-card__footer">
          {available ? (
            <Link
              className="result-reserve result-reserve--btn"
              to="/reserver"
              state={{
                nom: car.name,
                couleur: effColor ? colorName(effColor) : '',
                photo: shownPhoto || '',
                photos: gallery,
                features: active.features,
                prix: active.price,
                depart: depart || '',
                retour: retour || '',
                lieu,
              }}
            >
              Réserver maintenant <span className="result-reserve__arrow">→</span>
            </Link>
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
  const { currency, setCurrency } = useCurrency()
  const currencyOptions = CURRENCY_CODES.map(code => ({ value: code, label: CURRENCIES[code].label }))

  const lieu    = searchParams.get('lieu')      || ''
  const depart  = searchParams.get('depart')    || ''
  const retour  = searchParams.get('retour')    || ''
  const catParam = searchParams.get('categorie') || ''
  const carId   = searchParams.get('car')       || ''  // single-car mode

  const [sort,        setSort]        = useState('prix-asc')
  const [filterDispo, setFilterDispo] = useState(false)
  const [filterCat,   setFilterCat]   = useState(() => urlCatToKey(catParam))
  const [callingCar,  setCallingCar]  = useState(null)
  const [nameQuery,   setNameQuery]   = useState('')   // text search by model

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

    const q = nameQuery.trim().toLowerCase()
    if (q) list = list.filter(c => c.name.toLowerCase().includes(q))

    if (filterDispo) list = list.filter(c => c.available)

    if (sort === 'prix-asc')  list.sort((a, b) => a.price - b.price)
    if (sort === 'prix-desc') list.sort((a, b) => b.price - a.price)
    if (sort === 'nom')       list.sort((a, b) => a.name.localeCompare(b.name))

    list.sort((a, b) => (b.available ? 1 : 0) - (a.available ? 1 : 0))

    return list
  }, [baseList, filterCat, filterDispo, sort, nameQuery])

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
          {/* Top line: category tabs + search bar */}
          <div className="results-toolbar__top">
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

            {/* Text search by model */}
            <div className="results-search-wrap">
              <span className="results-search-icon" aria-hidden>🔍</span>
              <input
                type="search"
                className="results-search"
                placeholder="Rechercher un modèle…"
                value={nameQuery}
                onChange={e => setNameQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Second line: filters + sort, aligned under the search */}
          <div className="results-toolbar__controls">
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
              <SelectMenu value={sort} onChange={setSort} options={SORT_OPTIONS} ariaLabel="Trier par" />
            </div>

            {/* Currency */}
            <div className="sort-wrap">
              <span className="sort-label">Devise</span>
              <SelectMenu value={currency} onChange={setCurrency} options={currencyOptions} ariaLabel="Devise" />
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
                <ResultCard key={car.id} car={car} days={days} available={car.available} depart={depart} retour={retour} lieu={lieu} availableOnly={filterDispo} onCall={setCallingCar} />
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
