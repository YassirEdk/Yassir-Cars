import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DatePicker from './DatePicker'
import CityMenu from './CityMenu'
import SelectMenu from './SelectMenu'
import SearchField from './SearchField'
import Icon from './Icon'
import SocialIcon from './SocialIcon'
import { cars as stockCars, pickupPlaces, addDays, searchCategoryOptions, categoryKey } from '../data'
import { useSettings } from '../lib/SettingsContext'
import { fetchCars } from '../lib/cars'
import { lowestPrice } from '../lib/pricing'
import { formatNumber } from '../lib/currency'
import { waLink } from '../lib/contact'
import { atPlace } from '../lib/cities'
import { loadSearch, saveSearch, loadCity } from '../lib/searchPrefs'
import { daysBetween, formatLongDate } from '../lib/dates'
import { scrollToSection } from '../lib/scroll'
import './hero.css'

/* ── The hero car ─────────────────────────────────────────────────────────────
   To show another car of the fleet: take its cut-out (transparent PNG, facing
   left), run `node scripts/build-hero.mjs <file>.png`, then update `name` and the
   size the script prints. The preload in index.html uses the same files. */
const CAR = {
  name: 'Dacia Logan',
  src: '/hero/car-1000.webp',
  srcSet: '/hero/car-640.webp 640w, /hero/car-1000.webp 1000w, /hero/car-1500.webp 1500w',
  sizes: '(max-width: 860px) min(92vw, 600px), min(52vw, 800px)',
  width: 1500,
  height: 682,
}

const PERKS = ['Kilométrage illimité', 'Assurance incluse']

const jours = (n) => `${n} jour${n > 1 ? 's' : ''}`

// Same day count as the results page prices with.
function rentalLength(depart, retour) {
  if (!depart || !retour || retour <= depart) return 0
  return daysBetween(depart, retour)
}

/* The car follows the mouse by a few pixels: --px and --py run from -1 to 1.
   Desktop only, and not for visitors who asked for less motion. */
function useParallax() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    const mq = window.matchMedia('(min-width: 861px) and (pointer: fine) and (prefers-reduced-motion: no-preference)')
    if (!el || !mq.matches) return

    let frame = 0
    const to = { x: 0, y: 0 }
    const at = { x: 0, y: 0 }
    const step = () => {
      at.x += (to.x - at.x) * 0.08
      at.y += (to.y - at.y) * 0.08
      el.style.setProperty('--px', at.x.toFixed(3))
      el.style.setProperty('--py', at.y.toFixed(3))
      const moving = Math.abs(to.x - at.x) + Math.abs(to.y - at.y) > 0.004
      frame = moving ? requestAnimationFrame(step) : 0
    }
    const aim = (x, y) => {
      to.x = x
      to.y = y
      if (!frame) frame = requestAnimationFrame(step)
    }
    const clamp = (n) => Math.max(-1, Math.min(1, n))
    const onMove = (e) => aim(clamp((e.clientX / window.innerWidth) * 2 - 1), clamp((e.clientY / window.innerHeight) * 2 - 1))
    const onLeave = () => aim(0, 0)
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])
  return ref
}

// The fleet, for the prices shown here. The stock list stands in until it loads.
function useFleet() {
  const [fleet, setFleet] = useState(stockCars)
  useEffect(() => {
    let alive = true
    fetchCars()
      .then(list => { if (alive && list.length) setFleet(list) })
      .catch(() => { /* keep the stock prices */ })
    return () => { alive = false }
  }, [])
  return fleet
}

/* Tail-light streaks behind the car. Drawn around the car's own box, which is
   0–1000 wide and 0–454 high here. */
function Streaks() {
  const lines = [
    'M1620 62 C 1380 92 1140 118 975 128 S 420 200 -130 300',
    'M1620 -30 C 1300 -24 1010 -92 680 -86 S 140 70 -130 262',
    'M1620 246 C 1400 256 1180 276 985 290',
  ]
  return (
    <svg className="hero-streaks" viewBox="-150 -120 1770 620" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="streak" gradientUnits="userSpaceOnUse" x1="1620" y1="0" x2="-130" y2="0">
          <stop offset="0" stopColor="#da0626" stopOpacity="0" />
          <stop offset=".2" stopColor="#da0626" stopOpacity=".5" />
          <stop offset=".42" stopColor="#da0626" stopOpacity=".55" />
          <stop offset=".64" stopColor="#da0626" stopOpacity=".18" />
          <stop offset=".77" stopColor="#da0626" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g stroke="url(#streak)" strokeWidth="2" strokeLinecap="round">
        {lines.map(d => <path key={d} d={d} pathLength="1" />)}
      </g>
    </svg>
  )
}

/* What the car stands on: the shadow under the body, and a darker one where each
   tyre touches, drawn on the car's picture (1500 × 682). */
function Ground() {
  return (
    <div className="hero-car__ground" aria-hidden="true">
      <span className="hero-car__floor" />
      <svg className="hero-car__shade" viewBox="0 0 1500 682" focusable="false">
        <defs>
          <filter id="shade-soft" x="-20%" y="-80%" width="140%" height="260%" colorInterpolationFilters="sRGB"><feGaussianBlur stdDeviation="15" /></filter>
          <filter id="shade-tight" x="-30%" y="-150%" width="160%" height="400%" colorInterpolationFilters="sRGB"><feGaussianBlur stdDeviation="6" /></filter>
        </defs>
        <path d="M60 600 L400 662 L640 692 L770 682 L1290 564 L1425 546 L1440 512 L1150 496 L260 552 Z"
          fill="#08090b" opacity=".5" filter="url(#shade-soft)" />
        <g fill="#08090b" opacity=".8" filter="url(#shade-tight)">
          <ellipse cx="646" cy="680" rx="104" ry="9" />
          <ellipse cx="1336" cy="547" rx="76" ry="8" />
        </g>
      </svg>
    </div>
  )
}

export default function Hero() {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState(() => {
    const saved = loadSearch()
    // A saved date that has gone by is no help: start from tomorrow instead.
    const depart = saved?.depart >= today ? saved.depart : addDays(today, 1)
    return {
      lieu:       saved?.lieu || loadCity(),
      lieuRetour: saved?.lieuRetour || '',
      depart,
      retour:     saved?.retour > depart ? saved.retour : '',
      categorie:  categoryKey(saved?.categorie),
    }
  })
  // "Retour dans une autre agence" is ticked: its field shows.
  const [elsewhere, setElsewhere] = useState(Boolean(form.lieuRetour))
  const [errors, setErrors] = useState({})
  const [shake,  setShake]  = useState(false)
  // Bumped when a start date is picked, so the return calendar opens by itself.
  const [openRetour, setOpenRetour] = useState(0)
  const navigate = useNavigate()
  const { settings, status } = useSettings()
  const fleet = useFleet()
  const heroRef = useParallax()
  const minDays = settings.minRentalDays

  const length = rentalLength(form.depart, form.retour)

  // Cheapest car of the fleet.
  const fromPrice = lowestPrice(fleet.filter(c => !c.damaged), settings)

  // Keeps the search, and drops the errors of the fields it touches.
  const update = (patch) => {
    setForm(f => { const next = { ...f, ...patch }; saveSearch(next); return next })
    setErrors(prev => {
      const next = { ...prev }
      for (const key of Object.keys(patch)) delete next[key]
      return next
    })
  }

  const toggleElsewhere = (on) => {
    setElsewhere(on)
    if (!on) update({ lieuRetour: '' })
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const newErrors = {}
    if (!form.lieu.trim())
      newErrors.lieu = 'Choisissez un lieu'

    if (elsewhere && !form.lieuRetour)
      newErrors.lieuRetour = 'Choisissez un lieu de retour'

    if (!form.depart)
      newErrors.depart = 'Choisissez une date de début'
    else if (form.depart < today)
      newErrors.depart = 'Cette date est déjà passée'

    if (!form.retour)
      newErrors.retour = 'Choisissez une date de retour'
    else if (form.retour < today)
      newErrors.retour = 'Cette date est déjà passée'
    else if (form.depart && form.retour < addDays(form.depart, minDays))
      newErrors.retour = `Au moins ${jours(minDays)} de location`

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setShake(true)
      setTimeout(() => setShake(false), 500)
      return
    }

    // Back where it was picked up is the ordinary case: nothing to carry.
    const lieuRetour = form.lieuRetour === form.lieu ? '' : form.lieuRetour
    saveSearch({ ...form, lieuRetour })

    setErrors({})
    const params = new URLSearchParams()
    params.set('lieu',   form.lieu)
    if (lieuRetour) params.set('lieuRetour', lieuRetour)
    params.set('depart', form.depart)
    params.set('retour', form.retour)
    if (form.categorie) params.set('categorie', form.categorie)
    navigate(`/resultats?${params.toString()}`)
  }

  const waText = [
    'Bonjour YASSIR CARS, je souhaite réserver une voiture',
    form.lieu ? ` ${atPlace(form.lieu)}` : '',
    length ? ` du ${formatLongDate(form.depart)} au ${formatLongDate(form.retour)}` : '',
    '.',
  ].join('')

  return (
    <section className="hero" id="accueil" ref={heroRef}>
      <div className="hero-bg" aria-hidden="true" />

      <div className="container hero-content">
        <div className="hero-stage">
          <div className="hero-intro">
            <p className="hero-eyebrow hero-in" style={{ '--i': 0 }}>
              <Icon name="star" />
              <strong>4.9/5</strong>
              <i className="hero-dot" aria-hidden="true" />
              <span>Plus de 10 000 clients au Maroc</span>
            </p>

            <h1 className="hero-title hero-in" style={{ '--i': 1 }}>
              Conduisez avec<br />
              <span className="accent">Style & Liberté</span>
            </h1>

            <p className="hero-subtitle hero-in" style={{ '--i': 2 }}>
              Découvrez notre gamme exceptionnelle de véhicules. De la citadine élégante au SUV luxueux,
              YASSIR CARS vous offre la meilleure expérience de location au Maroc.
            </p>

            <div className="hero-ctas hero-in" style={{ '--i': 3 }}>
              <a href="#flotte" className="btn btn-dark hero-cta">
                Voir la flotte <Icon name="arrowRight" className="hero-cta__arrow" />
              </a>
              {/* Holds its place while the number loads, so nothing jumps. */}
              {(settings.whatsapp || status === 'loading') && (
                <a
                  className="btn hero-cta hero-cta--ghost"
                  href={settings.whatsapp ? waLink(settings.whatsapp, waText) : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <SocialIcon name="whatsapp" /> Réserver sur WhatsApp
                </a>
              )}
            </div>

            <ul className="hero-perks hero-in" style={{ '--i': 4 }}>
              {fromPrice && (
                <li><Icon name="checkCircle" /><span>À partir de <strong>{formatNumber(fromPrice)}&nbsp;MAD</strong> / jour</span></li>
              )}
              {PERKS.map(p => <li key={p}><Icon name="checkCircle" />{p}</li>)}
            </ul>
          </div>

          <div className="hero-car">
            <Streaks />
            <Ground />
            <div className="hero-car__body">
              <img
                className="hero-car__img"
                src={CAR.src}
                srcSet={CAR.srcSet}
                sizes={CAR.sizes}
                width={CAR.width}
                height={CAR.height}
                alt={`${CAR.name}, une voiture de notre flotte`}
                /* LCP element: load it ahead of everything else. Lowercase: React 18
                   does not know the camelCase spelling. */
                fetchpriority="high"
                decoding="async"
              />
              <span className="hero-lamp" aria-hidden="true" />
            </div>
          </div>
        </div>

        <div className="booking-card hero-in" id="reserver" style={{ '--i': 5 }}>
          <form className={`booking-form ${shake ? 'form-shake' : ''}`} onSubmit={handleSubmit} noValidate>
            <div className="booking-head">
              <h2 className="booking-heading">Réservez votre véhicule</h2>
              <label className="bk-switch">
                <input type="checkbox" checked={elsewhere} onChange={e => toggleElsewhere(e.target.checked)} />
                <span className="bk-switch__track" aria-hidden="true" />
                <span>Retour dans une autre agence</span>
              </label>
            </div>

            <div className={`bk-fields bk-fields--tall${elsewhere ? ' has-return' : ''}`}>
              <SearchField id="lieu" icon="pin" label="Lieu de prise en charge" error={errors.lieu}>
                <CityMenu
                  value={form.lieu}
                  onChange={(lieu) => update({ lieu })}
                  cities={pickupPlaces}
                  ariaLabel="Lieu de prise en charge"
                  className="smenu--field"
                  flip
                />
              </SearchField>

              {elsewhere && (
                <SearchField id="rendu" icon="pin" label="Lieu de retour" error={errors.lieuRetour}>
                  <CityMenu
                    value={form.lieuRetour}
                    onChange={(lieuRetour) => update({ lieuRetour })}
                    cities={pickupPlaces}
                    ariaLabel="Lieu de retour"
                    className="smenu--field"
                    flip
                  />
                </SearchField>
              )}

              <SearchField id="depart" icon="calendar" label="Date de début" error={errors.depart}>
                <DatePicker
                  value={form.depart}
                  onChange={(depart) => {
                    // Too short (or backwards) with the new start: ask for the return again.
                    update(form.retour >= addDays(depart, minDays) ? { depart } : { depart, retour: '' })
                    setOpenRetour(n => n + 1)
                  }}
                  min={today}
                  ariaLabel="Date de début"
                  friendly
                  placeholder="Choisir une date"
                  flip
                />
              </SearchField>

              <SearchField id="retour" icon="calendar" label="Date de retour" error={errors.retour}>
                <DatePicker
                  value={form.retour}
                  onChange={(retour) => update({ retour })}
                  min={form.depart ? addDays(form.depart, minDays) : today}
                  highlight={form.depart || undefined}
                  openKey={openRetour}
                  ariaLabel="Date de retour"
                  friendly
                  placeholder="Choisir une date"
                  flip
                />
              </SearchField>

              <SearchField id="categorie" icon="car" label="Catégorie">
                <SelectMenu
                  value={form.categorie}
                  onChange={(categorie) => update({ categorie })}
                  options={searchCategoryOptions}
                  ariaLabel="Catégorie"
                  className="smenu--field"
                  flip
                />
              </SearchField>
            </div>

            <div className="booking-go">
              <button type="submit" className="btn btn-accent booking-submit">
                <Icon name="search" className="booking-submit__icon" />
                <span>Rechercher<span className="booking-submit__more"> un véhicule</span></span>
              </button>
            </div>
          </form>
        </div>

        <button type="button" className="hero-scroll hero-in" style={{ '--i': 7 }}
          onClick={() => scrollToSection('chiffres')} aria-label="Découvrir la suite">
          <svg viewBox="0 0 24 38" width="24" height="38" fill="none" aria-hidden="true" focusable="false">
            <rect x="1" y="1" width="22" height="36" rx="11" stroke="currentColor" strokeWidth="1.6" />
            <circle className="hero-scroll__dot" cx="12" cy="11" r="2.6" fill="currentColor" />
          </svg>
        </button>
      </div>
    </section>
  )
}
