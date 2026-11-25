import { Fragment, useState, useMemo, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { categoryOptions } from '../data'
import { useSettings } from '../lib/SettingsContext'
import { fetchCars, mergeByModel } from '../lib/cars'
import { formatPhone, waLink } from '../lib/contact'
import { daysBetween, formatDayMonth, formatLongDate } from '../lib/dates'
import { saveSearch } from '../lib/searchPrefs'
import { atPlace } from '../lib/cities'
import {
  readFilters, writeFilters, filterChoices, narrowModels, categoryCounts, sortModels, activeFilterCount, NO_FILTERS,
} from '../lib/resultFilters'
import { PHONE, useMediaQuery } from '../hooks/useMediaQuery'
import { useHideOnScroll } from '../hooks/useHideOnScroll'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useDialog } from '../hooks/useDialog'
import Logo from '../components/Logo'
import { BackHome } from '../components/BackLink'
import Icon from '../components/Icon'
import SocialIcon from '../components/SocialIcon'
import ReserveDrawer from '../components/ReserveDrawer'
import SearchBar from '../components/results/SearchBar'
import ResultTools from '../components/results/Filters'
import ResultCard, { ResultSkeleton } from '../components/results/ResultCard'
import './results.css'

/* ── Phone modal ── */
function PhoneModal({ car, onClose }) {
  const panelRef = useDialog(onClose)
  const { settings } = useSettings()

  return (
    <div className="phone-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="phone-modal" role="dialog" aria-modal="true" aria-labelledby="phone-title" tabIndex={-1} ref={panelRef}>
        <button type="button" className="phone-modal__close" onClick={onClose} aria-label="Fermer"><Icon name="close" /></button>

        <div className="phone-modal__icon"><Icon name="phone" /></div>
        <h2 className="phone-modal__title" id="phone-title">Contacter l’agence</h2>
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

          {settings.whatsapp && (
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
          )}
        </div>

        <p className="phone-modal__hours"><Icon name="clock" /> Lun – sam 8h – 20h, dim. 9h – 18h</p>
      </div>
    </div>
  )
}

/* ── "The car you came for is taken" popup ──────────────────────────────────
   Shown on arrival when the visitor was redirected here from a car whose dates
   were already booked, so the reason they can't find it is never a mystery. */
function UnavailableNotice({ info, onClose }) {
  const panelRef = useDialog(onClose)

  return (
    <div className="phone-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="phone-modal unavail-notice" role="alertdialog" aria-modal="true" aria-labelledby="unavail-title" tabIndex={-1} ref={panelRef}>
        <button type="button" className="phone-modal__close" onClick={onClose} aria-label="Fermer"><Icon name="close" /></button>

        <div className="unavail-notice__icon" aria-hidden>
          <Icon name="calendarX" size={32} />
        </div>

        <h2 className="phone-modal__title" id="unavail-title">Véhicule non disponible</h2>
        <p className="unavail-notice__text">
          La <strong>{info.name}</strong>{info.couleur ? <> en <strong>{info.couleur}</strong></> : null} est
          déjà réservée du <strong>{formatLongDate(info.depart)}</strong> au <strong>{formatLongDate(info.retour)}</strong>.
        </p>
        <p className="unavail-notice__sub">
          Voici tous les véhicules libres pour ces mêmes dates.
        </p>

        <button type="button" className="btn btn-accent unavail-notice__btn" onClick={onClose}>
          Voir les véhicules disponibles <Icon name="arrowRight" className="btn__arrow" />
        </button>
      </div>
    </div>
  )
}

// True for every car, so said once: on top of the list, or under the second car
// on a phone, where the cars come first.
const TRUST = [
  { icon: 'check',  label: 'Annulation gratuite' },
  { icon: 'shield', label: 'Assurance incluse' },
  { icon: 'road',   label: 'Kilométrage illimité' },
  { icon: 'phone',  label: 'Support 24h/24' },
]
const Trust = ({ className }) => (
  <ul className={className}>
    {TRUST.map(t => <li key={t.label}><Icon name={t.icon} /> {t.label}</li>)}
  </ul>
)

/* ── Page ── */
export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { settings } = useSettings()
  const isPhone = useMediaQuery(PHONE)
  // Carried in by AvailabilityModal when the car the visitor wanted was booked.
  const [notice, setNotice] = useState(location.state?.unavailable ?? null)

  const lieu   = searchParams.get('lieu')   || ''
  const depart = searchParams.get('depart') || ''
  const retour = searchParams.get('retour') || ''
  const lieuRetour = searchParams.get('lieuRetour') || ''   // '' = same place
  const carId  = searchParams.get('car')    || ''  // single-car mode
  const days   = daysBetween(depart, retour)

  const filters = useMemo(() => readFilters(searchParams), [searchParams])
  /* Kept out of the URL: one history write per keystroke would hit the limit
     Safari puts on them. */
  const [query, setQuery] = useState('')
  const activeCount = activeFilterCount(filters, query)

  // `keepScroll`: App scrolls to the top on a new page, and this isn't one.
  const setFilters = (patch) =>
    setSearchParams(writeFilters(searchParams, { ...filters, ...patch }), { replace: true, state: { keepScroll: true } })
  const resetFilters = () => { setQuery(''); setFilters({ ...NO_FILTERS, categorie: filters.categorie }) }
  const resetAll = () => { setQuery(''); setFilters(NO_FILTERS) }

  const [callingCar, setCallingCar] = useState(null)
  const barRef = useRef(null)
  const barHidden = useHideOnScroll(barRef)

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

  // Every model. With ?car=<id>, only the one that unit belongs to.
  const models = useMemo(() => {
    const all = mergeByModel(cars)
    return carId
      ? all.filter(m => m.units.some(u => String(u.id) === String(carId)))
      : all
  }, [cars, carId])

  const choices = useMemo(() => filterChoices(models, settings), [models, settings])

  // The list before the category pills: what their counts are taken from.
  const matching = useMemo(
    () => narrowModels(models, { filters, query, depart, retour, settings }),
    [models, filters, query, depart, retour, settings],
  )
  const counts = useMemo(() => categoryCounts(matching), [matching])
  const results = useMemo(() => sortModels(
    filters.categorie ? matching.filter(m => m.categories.includes(filters.categorie)) : matching,
    filters.tri,
  ), [matching, filters.categorie, filters.tri])

  const availableCount = results.filter(c => c.available).length
  const someTaken = results.some(c => !c.available)

  /* Booking drawer. The open car is tracked by id (not index) so filtering or
     sorting while the drawer is open keeps the right vehicle on screen. */
  const [booking, setBooking] = useState(null)   // { id, color }
  const bookingListed = booking && results.some(c => String(c.id) === String(booking.id))
  // The drawer gets the whole model, not just the units the filters left.
  const bookingCar = bookingListed ? models.find(m => String(m.id) === String(booking.id)) : null
  // The car dropped out of the current filter → close rather than show a stale one.
  useEffect(() => {
    if (booking && !bookingListed && !loading) setBooking(null)
  }, [booking, bookingListed, loading])

  useDocumentTitle([
    'Location voiture', lieu,
    depart && retour ? `du ${formatDayMonth(depart)} au ${formatDayMonth(retour)}` : '',
  ].filter(Boolean).join(' ') + ' | YASSIR CARS')

  // New place or dates; the filters in use stay on.
  const runSearch = (form) => {
    const params = writeFilters(new URLSearchParams(), { ...filters, categorie: form.categorie })
    if (form.lieu)   params.set('lieu', form.lieu)
    if (form.depart) params.set('depart', form.depart)
    if (form.retour) params.set('retour', form.retour)
    if (form.lieuRetour) params.set('lieuRetour', form.lieuRetour)
    saveSearch({ lieu: form.lieu, lieuRetour: form.lieuRetour, depart: form.depart, retour: form.retour, categorie: form.categorie })
    navigate(`/resultats?${params.toString()}`, { replace: true })
  }

  // "Libre dès le X" → re-run the same search from that date, keeping the trip
  // the same length as the one the visitor originally asked for.
  const searchFrom = (isoStart) => {
    const end = new Date(`${isoStart}T00:00:00Z`)
    end.setUTCDate(end.getUTCDate() + Math.max(days, settings.minRentalDays))
    runSearch({ lieu, lieuRetour, depart: isoStart, retour: end.toISOString().slice(0, 10), categorie: filters.categorie })
  }

  const s = availableCount > 1 ? 's' : ''
  const pills = [
    { value: '', label: 'Tous', count: matching.length },
    ...categoryOptions
      .map(o => ({ ...o, count: counts[o.value] ?? 0 }))
      // The selected one stays, even empty, so it can be unselected.
      .filter(o => o.count > 0 || o.value === filters.categorie),
  ]
  const categoryPills = (
    <div className="results-cats" role="group" aria-label="Catégorie">
      {pills.map(p => (
        <button
          type="button"
          key={p.value || 'all'}
          className={`results-cat-btn ${filters.categorie === p.value ? 'active' : ''}`}
          aria-pressed={filters.categorie === p.value}
          onClick={() => setFilters({ categorie: p.value })}
        >
          {p.label} <span className="results-cat-btn__n">{p.count}</span>
        </button>
      ))}
    </div>
  )

  return (
    <div className={`results-page ${bookingCar ? 'results-page--drawer' : ''}`}>
      <header className="results-nav results-nav--static">
        <div className="container results-nav__inner">
          <Link to="/" aria-label="YASSIR CARS, accueil">
            <Logo size={36} />
          </Link>
          <BackHome />
        </div>
      </header>

      <SearchBar search={{ lieu, lieuRetour, depart, retour, categorie: filters.categorie }} onSearch={runSearch} />

      {/* On a phone the bar below says it in two words; the heading stays for
          screen readers and search engines. */}
      <div className="results-summary">
        <div className="container results-summary__inner">
          <div className="results-summary__text">
            <h1>
              {loading
                ? 'Recherche en cours…'
                : <><span className="results-count">{availableCount}</span> voiture{s} disponible{s}{lieu && <> {atPlace(lieu)}</>}</>}
            </h1>
            {depart && (
              <p>
                Du <strong>{formatLongDate(depart)}</strong>
                {retour && <> au <strong>{formatLongDate(retour)}</strong></>}
                {days > 1 && <> · <strong>{days} jours</strong></>}
                {lieuRetour && <> · retour {atPlace(lieuRetour)}</>}
              </p>
            )}
          </div>
          {!isPhone && <Trust className="results-summary__meta" />}
        </div>
      </div>

      <div className={`results-bar ${barHidden ? 'is-hidden' : ''}`} ref={barRef}>
        <div className="container results-bar__inner">
          {isPhone
            ? <span className="results-bar__count" aria-live="polite">{loading ? 'Recherche…' : `${results.length} voiture${results.length > 1 ? 's' : ''}`}</span>
            : categoryPills}
          <ResultTools
            isPhone={isPhone}
            count={results.length}
            activeCount={activeCount}
            filters={filters}
            choices={choices}
            onChange={setFilters}
            onReset={resetFilters}
            query={query}
            onQuery={setQuery}
            canHideTaken={someTaken}
          />
        </div>
      </div>

      <div className="results-body">
        <div className="container">
          {/* Its place is kept while the cars load, so they don't jump. */}
          {isPhone && (loading ? <div className="results-cats results-cats--wait" /> : categoryPills)}
          {loading ? (
            <div className="result-list">
              {[0, 1, 2].map(i => <ResultSkeleton key={i} />)}
            </div>
          ) : results.length === 0 ? (
            <div className="no-results">
              <div className="no-results__icon"><Icon name="search" /></div>
              <h2>Aucun véhicule trouvé</h2>
              <p>
                {activeCount > 0
                  ? 'Aucune voiture ne correspond à tous vos filtres.'
                  : 'Aucune voiture dans cette catégorie pour le moment.'}
              </p>
              <div className="no-results__actions">
                {activeCount > 0 && (
                  <button type="button" className="btn btn-primary" onClick={resetFilters}>Effacer les filtres</button>
                )}
                {filters.categorie && (
                  <button type="button" className={`btn ${activeCount > 0 ? 'btn-ghost' : 'btn-primary'}`} onClick={resetAll}>
                    Voir toutes les catégories
                  </button>
                )}
                {!activeCount && !filters.categorie && <Link to="/" className="btn btn-primary">Nouvelle recherche</Link>}
              </div>
            </div>
          ) : (
            <div className="result-list">
              {results.map((car, i) => (
                <Fragment key={car.id}>
                  <ResultCard
                    car={car}
                    days={days}
                    depart={depart}
                    retour={retour}
                    showOk={someTaken}
                    onCall={setCallingCar}
                    onSearchFrom={searchFrom}
                    onReserve={(c, color) => setBooking({ id: c.id, color })}
                    isOpen={Boolean(bookingCar) && String(car.id) === String(booking.id)}
                    eager={i < 2}
                  />
                  {isPhone && i === Math.min(1, results.length - 1) && <Trust className="results-trust" />}
                </Fragment>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Side booking panel — replaces the jump to /reserver */}
      {bookingCar && (
        <ReserveDrawer
          key={`${booking.id}-${booking.color}`}
          car={bookingCar}
          initialColor={booking.color}
          depart={depart}
          retour={retour}
          lieu={lieu}
          lieuRetour={lieuRetour}
          onClose={() => setBooking(null)}
        />
      )}

      {/* "The car you came for is booked" popup */}
      {notice && <UnavailableNotice info={notice} onClose={() => setNotice(null)} />}

      {callingCar && <PhoneModal car={callingCar} onClose={() => setCallingCar(null)} />}

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
