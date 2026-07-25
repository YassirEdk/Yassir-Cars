import { useState, useMemo, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { carInCategory, colorName, moroccanCities, addDays } from '../data'
import { useSettings } from '../lib/SettingsContext'
import { useCurrency } from '../lib/CurrencyContext'
import { CURRENCIES, CURRENCY_CODES, convert, formatMoney } from '../lib/currency'
import SelectMenu from '../components/SelectMenu'
import { fetchCars, mergeByModel, isModelAvailable, isCarAvailable, effectiveBadge, nextFreeDateForModel } from '../lib/cars'
import Logo from '../components/Logo'
import BackLink from '../components/BackLink'
import CityWheel from '../components/CityWheel'
import DatePicker from '../components/DatePicker'
import Icon from '../components/Icon'
import SocialIcon from '../components/SocialIcon'
import FeaturePills from '../components/FeaturePills'
import ReserveDrawer from '../components/ReserveDrawer'
import { formatPhone, waLink } from '../lib/contact'
import { discounted, discountLabel, rateForCar } from '../lib/pricing'

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
            <label><Icon name="pin" /> Lieu</label>
            <CityWheel
              value={form.lieu}
              onChange={(city) => setForm(f => ({ ...f, lieu: city }))}
              cities={moroccanCities}
            />
          </div>
          <div className="mini-field">
            <label><Icon name="calendar" /> Départ</label>
            <DatePicker
              value={form.depart}
              onChange={(iso) => setForm(f => ({ ...f, depart: iso }))}
              placeholder="Choisir une date"
              className="mini-datepicker"
            />
          </div>
          <div className="mini-field">
            <label><Icon name="calendar" /> Retour</label>
            <DatePicker
              value={form.retour}
              onChange={(iso) => setForm(f => ({ ...f, retour: iso }))}
              min={form.depart ? addDays(form.depart, settings.minRentalDays) : undefined}
              highlight={form.depart || undefined}
              placeholder="Choisir une date"
              className="mini-datepicker"
            />
          </div>
          <div className="mini-field">
            <label><Icon name="car" /> Catégorie</label>
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

        <div className="phone-modal__icon"><Icon name="phone" /></div>
        <h3 className="phone-modal__title">Contacter l'agence</h3>
        <p className="phone-modal__car">Pour réserver la <strong>{car.name}</strong></p>

        <div className="phone-modal__numbers">
          {/* Rendered only when a real number is configured in the admin
              settings — a dead placeholder number is worse than no number. */}
          {settings.phone && (
            <a href={`tel:+${settings.phone}`} className="phone-modal__btn phone-modal__btn--call">
              <span className="phone-modal__btn-icon"><Icon name="phone" /></span>
              <div>
                <span className="phone-modal__btn-label">Appel standard</span>
                <span className="phone-modal__btn-num">{formatPhone(settings.phone)}</span>
              </div>
            </a>
          )}

          <a
            href={waLink(settings.whatsapp, `Bonjour YASSIR CARS, je suis intéressé par la ${car.name}.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="phone-modal__btn phone-modal__btn--whatsapp"
          >
            <span className="phone-modal__btn-icon"><SocialIcon name="whatsapp" /></span>
            <div>
              <span className="phone-modal__btn-label">WhatsApp</span>
              <span className="phone-modal__btn-num">{formatPhone(settings.whatsapp)}</span>
            </div>
          </a>
        </div>

        <p className="phone-modal__hours"><Icon name="clock" /> Disponible Lun–Sam 8h–20h · Dim 9h–18h</p>
        <button className="phone-modal__cancel" onClick={onClose}>Annuler</button>
      </div>
    </div>
  )
}

/* ── Individual result card ── */
function ResultCard({ car, days, available, depart, retour, lieu, availableOnly, onCall, onSearchFrom, onReserve, isOpen }) {
  const { currency } = useCurrency()
  const { settings } = useSettings()
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
  // Only computed for cards that came back unavailable.
  const freeFrom = available ? null : nextFreeDateForModel(car, depart)
  // The promotion is per car, so it follows the colour/unit the visitor picked.
  const rate = rateForCar(active.id, settings)
  const promoPrice = discounted(active.price, rate)
  const promoLabel = discountLabel(rate)
  const total = promoPrice * days
  const oldTotal = active.price * days

  return (
    <div className={`result-card ${activeAvailable ? '' : 'result-card--unavailable'} ${isOpen ? 'result-card--open' : ''}`}>
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
          {activeAvailable
            ? <><Icon name="checkCircle" /> Disponible</>
            : <><Icon name="clock" /> Non disponible</>}
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
            {promoLabel && (
              <div className="result-price-old-row">
                <span className="result-price-old">{formatMoney(active.price, currency)}</span>
                <span className="result-discount">{promoLabel}</span>
              </div>
            )}
            <div className="result-card__day">
              <span className="result-price">{convert(promoPrice, currency).toLocaleString('fr-FR')}</span>
              <span className="result-currency"> {CURRENCIES[currency].symbol}</span>
              <span className="result-per"> / jour</span>
            </div>
            {days > 1 && (
              <div className="result-total">
                Total : <strong>{formatMoney(total, currency)}</strong>
                {promoLabel && <s className="result-total-old">{formatMoney(oldTotal, currency)}</s>}
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

        <FeaturePills features={active.features} className="result-card__equip" pillClass="equip-pill" />

        <div className="result-card__features">
          <span className="feature-pill">✓ Kilométrage illimité</span>
          <span className="feature-pill">✓ Assurance incluse</span>
          <span className="feature-pill">✓ Assistance 24h/24</span>
        </div>

        <div className="result-card__footer">
          {available ? (
            /* Opens the booking drawer on the right instead of navigating away,
               so the rest of the results stay on screen. */
            <button
              type="button"
              className="result-reserve result-reserve--btn"
              onClick={() => onReserve(car)}
              aria-expanded={isOpen}
            >
              <span className="result-reserve__arrow">Réserver maintenant </span>
            </button>
          ) : (
            /* Rather than dead-ending, offer the first date this model frees up
               — the blocked ranges are already loaded on the card. */
            <div className="result-unavailable">
              <span className="result-unavailable-label">
                <Icon name="clock" /> Indisponible pour ces dates
              </span>
              {freeFrom && (
                <button type="button" className="result-freefrom" onClick={() => onSearchFrom(freeFrom)}>
                  Libre à partir du <strong>{fmt(freeFrom)}</strong> — voir ces dates
                </button>
              )}
            </div>
          )}
          {/* With a call number configured, offer the choice; without one, skip
              the modal entirely and go straight to WhatsApp. */}
          {settings.phone ? (
            <button className="result-phone" onClick={() => onCall(car)}>
              <Icon name="phone" /> Appeler
            </button>
          ) : (
            <a
              className="result-phone"
              href={waLink(settings.whatsapp, `Bonjour YASSIR CARS, je suis intéressé par la ${car.name}.`)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <SocialIcon name="whatsapp" /> WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── "The car you came for is taken" popup ──────────────────────────────────
   Shown on arrival when the visitor was redirected here from a car whose dates
   were already booked, so the reason they can't find it is never a mystery. */
function UnavailableNotice({ info, onClose }) {
  const overlayRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="phone-overlay"
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
      role="alertdialog"
      aria-labelledby="unavail-title"
    >
      <div className="phone-modal unavail-notice">
        <button className="phone-modal__close" onClick={onClose} aria-label="Fermer">✕</button>

        <div className="unavail-notice__icon" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
            strokeLinecap="round" width="30" height="30">
            <circle cx="12" cy="12" r="9" />
            <path d="m15 9-6 6M9 9l6 6" />
          </svg>
        </div>

        <h3 className="phone-modal__title" id="unavail-title">Véhicule non disponible</h3>
        <p className="unavail-notice__text">
          La <strong>{info.name}</strong>{info.couleur ? <> en <strong>{info.couleur}</strong></> : null} est
          déjà réservée du <strong>{fmt(info.depart)}</strong> au <strong>{fmt(info.retour)}</strong>.
        </p>
        <p className="unavail-notice__sub">
          Voici tous les véhicules libres pour ces mêmes dates.
        </p>

        <button className="btn btn-accent unavail-notice__btn" onClick={onClose}>
          Voir les véhicules disponibles →
        </button>
      </div>
    </div>
  )
}

/* ── Placeholder card shown while the cars are still loading ── */
function ResultSkeleton() {
  return (
    <div className="result-card result-skeleton" aria-hidden>
      <div className="result-card__img sk-block" />
      <div className="result-card__body">
        <div className="sk-line sk-line--title" />
        <div className="sk-line sk-line--short" />
        <div className="sk-line" />
        <div className="sk-line sk-line--short" />
        <div className="result-card__footer">
          <div className="sk-line sk-line--btn" />
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
  const location = useLocation()
  const { settings } = useSettings()
  // Carried in by AvailabilityModal when the car the visitor wanted was booked.
  const [notice, setNotice] = useState(location.state?.unavailable ?? null)
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

  // On phones, tuck the "Disponibles seulement / Trier par" row away while the
  // visitor scrolls down through the results, and bring it back on scroll up —
  // it frees vertical space for the cars without losing the filters.
  const [hideControls, setHideControls] = useState(false)
  useEffect(() => {
    let lastY = window.scrollY
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = window.scrollY
        if (y < 160) setHideControls(false)          // always shown near the top
        else if (y > lastY + 6) setHideControls(true)  // scrolling down → hide
        else if (y < lastY - 6) setHideControls(false) // scrolling up → reveal
        lastY = y
        ticking = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const days = daysBetween(depart, retour)

  const [cars, setCars] = useState([])
  // Cars arrive asynchronously (always — even the static fallback resolves a
  // promise). Without this flag the empty state renders on the very first paint
  // and every visitor is briefly told there are no cars for their dates.
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    fetchCars()
      .then(list => { if (alive) setCars(list) })
      .finally(() => { if (alive) setLoading(false) })
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

  /* Booking drawer. The open car is tracked by id (not index) so filtering or
     sorting while the drawer is open keeps the right vehicle on screen. */
  const [openCarId, setOpenCarId] = useState(null)
  const drawerIndex = openCarId == null
    ? -1
    : results.findIndex(c => String(c.id) === String(openCarId))
  // The car dropped out of the current filter → close rather than show a stale one.
  useEffect(() => {
    if (openCarId != null && drawerIndex === -1) setOpenCarId(null)
  }, [openCarId, drawerIndex])

  // "Libre à partir du X" → re-run the same search from that date, keeping the
  // trip the same length as the one the visitor originally asked for.
  const handleSearchFrom = (isoStart) => {
    const end = new Date(`${isoStart}T00:00:00Z`)
    end.setUTCDate(end.getUTCDate() + Math.max(days, settings.minRentalDays))
    handleNewSearch({
      lieu,
      depart: isoStart,
      retour: end.toISOString().slice(0, 10),
      categorie: catParam,
    })
  }

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
    <div className={`results-page ${drawerIndex > -1 ? 'results-page--drawer' : ''}`}>
      {/* Top nav */}
      <header className="results-nav">
        <div className="container results-nav__inner">
          <Link to="/" style={{ textDecoration: 'none' }}>
            <Logo size={36} animated={false} />
          </Link>
          <div className="results-nav__actions">
            {/* A global preference, not a filter — so it lives in the header
                instead of adding a fifth control to the toolbar. */}
            <SelectMenu
              value={currency}
              onChange={setCurrency}
              options={currencyOptions}
              ariaLabel="Devise"
              className="results-nav__currency"
            />
            <BackLink to="/" className="btn btn-outline-white btn-sm results-nav__back">← Retour<span className="results-nav__back-long"> à l'accueil</span></BackLink>
          </div>
        </div>
      </header>

      {/* Mini search bar */}
      <MiniSearch params={searchParams} onSearch={handleNewSearch} />

      {/* Summary banner */}
      <div className="results-summary">
        <div className="container results-summary__inner">
          <div className="results-summary__text">
            <h2>
              {loading
                ? 'Recherche en cours…'
                : <><span className="results-count">{availableCount}</span> voiture{availableCount > 1 ? 's' : ''} disponible{availableCount > 1 ? 's' : ''}</>}
            </h2>
            <p>
              {lieu && <><strong>{lieu}</strong> · </>}
              {depart && <>Du <strong>{fmt(depart)}</strong></>}
              {retour && <> au <strong>{fmt(retour)}</strong></>}
              {days > 1 && <> · <strong>{days} jours</strong></>}
            </p>
          </div>
          <div className="results-summary__meta">
            <span><Icon name="check" /> Annulation gratuite</span>
            <span><Icon name="shield" /> Assurance incluse</span>
            <span><Icon name="phone" /> Support 24h/24</span>
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
              <span className="results-search-icon" aria-hidden><Icon name="search" /></span>
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
          <div className={`results-toolbar__controls ${hideControls ? 'is-hidden' : ''}`}>
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

            {/* Currency — on a phone it moves out of the cramped top nav and
                sits here, to the right of "Trier par". Hidden on wider screens
                where the nav copy is shown instead. */}
            <SelectMenu
              value={currency}
              onChange={setCurrency}
              options={currencyOptions}
              ariaLabel="Devise"
              className="results-toolbar__currency"
            />
          </div>
        </div>
      </div>

      {/* Results grid */}
      <div className="results-body">
        <div className="container">
          {loading ? (
            <div className="result-list">
              {[0, 1, 2].map(i => <ResultSkeleton key={i} />)}
            </div>
          ) : results.length === 0 ? (
            <div className="no-results">
              <div className="no-results__icon"><Icon name="search" /></div>
              <h3>Aucun véhicule trouvé</h3>
              <p>Essayez de modifier vos dates ou votre catégorie.</p>
              <Link to="/" className="btn btn-primary">Nouvelle recherche</Link>
            </div>
          ) : (
            <div className="result-list">
              {results.map(car => (
                <ResultCard
                  key={car.id}
                  car={car}
                  days={days}
                  available={car.available}
                  depart={depart}
                  retour={retour}
                  lieu={lieu}
                  availableOnly={filterDispo}
                  onCall={setCallingCar}
                  onSearchFrom={handleSearchFrom}
                  onReserve={c => setOpenCarId(c.id)}
                  isOpen={String(car.id) === String(openCarId)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Side booking panel — replaces the jump to /reserver */}
      {drawerIndex > -1 && (
        <ReserveDrawer
          car={results[drawerIndex]}
          depart={depart}
          retour={retour}
          lieu={lieu}
          onClose={() => setOpenCarId(null)}
        />
      )}

      {/* "The car you came for is booked" popup */}
      {notice && <UnavailableNotice info={notice} onClose={() => setNotice(null)} />}

      {/* Phone modal */}
      {callingCar && (
        <PhoneModal car={callingCar} onClose={() => setCallingCar(null)} />
      )}

      {/* Footer strip */}
      <div className="results-footer-strip">
        <div className="container">
          <p>
            © {new Date().getFullYear()} YASSIR CARS
            {settings.phone && <> · <a href={`tel:+${settings.phone}`}>{formatPhone(settings.phone)}</a></>}
            {settings.contactEmail && <> · <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a></>}
          </p>
        </div>
      </div>
    </div>
  )
}
