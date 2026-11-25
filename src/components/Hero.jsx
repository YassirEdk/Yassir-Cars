import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DatePicker from './DatePicker'
import CityMenu from './CityMenu'
import SelectMenu from './SelectMenu'
import SearchField from './SearchField'
import Icon from './Icon'
import { moroccanCities, addDays } from '../data'
import { useSettings } from '../lib/SettingsContext'
import { loadSearch, saveSearch } from '../lib/searchPrefs'
import { scrollToSection } from '../lib/scroll'
import './hero.css'

/* Self-hosted, responsive hero. Regenerate with `node scripts/build-hero.mjs`.
   Previously a fixed 1800px JPEG pulled from Unsplash's CDN — a third-party
   round-trip on the LCP element of every first visit.
   Keep both in sync with the preload in index.html. */
const HERO_SRCSET = '/hero/hero-800.webp 800w, /hero/hero-1400.webp 1400w, /hero/hero-2000.webp 2000w'
const HERO_SIZES = '(max-width: 860px) 170vw, 100vw'
const HERO_FALLBACK = '/hero/hero-1400.jpg'

const categories = ['Toutes catégories', 'Économique', 'Citadine', 'Berline', 'SUV / 4x4', 'Luxe', 'Utilitaire']
const categoryOptions = categories.map((c, i) => ({ value: i === 0 ? '' : c, label: c }))

const stats = [
  { num: '500+', label: 'Véhicules' },
  { num: '15+', label: 'Agences' },
  { num: '10K+', label: 'Clients satisfaits' },
  { num: '24/7', label: 'Assistance' },
]

const jours = (n) => `${n} jour${n > 1 ? 's' : ''}`

// Same day count as the results page prices with.
function rentalLength(depart, retour) {
  if (!depart || !retour || retour <= depart) return 0
  return Math.ceil((new Date(retour) - new Date(depart)) / 86_400_000)
}

export default function Hero() {
  const saved = loadSearch()
  const [form, setForm] = useState({
    lieu:      saved?.lieu      ?? '',
    depart:    saved?.depart    ?? '',
    retour:    saved?.retour    ?? '',
    categorie: saved?.categorie ?? '',
  })
  const [errors, setErrors] = useState({})
  const [shake,  setShake]  = useState(false)
  // The photo has arrived: the headlights can come on.
  const [lit, setLit] = useState(false)
  // Bumped when a start date is picked, so the return calendar opens by itself.
  const [openRetour, setOpenRetour] = useState(0)
  const navigate = useNavigate()
  const { settings } = useSettings()
  const minDays = settings.minRentalDays

  const today = new Date().toISOString().split('T')[0]
  const length = rentalLength(form.depart, form.retour)

  const handleSubmit = (e) => {
    e.preventDefault()

    const newErrors = {}
    if (!form.lieu.trim())
      newErrors.lieu = 'Choisissez une ville'

    if (!form.depart)
      newErrors.depart = 'Choisissez une date de début'
    else if (form.depart < today)
      newErrors.depart = 'Cette date est déjà passée'

    if (!form.retour)
      newErrors.retour = 'Choisissez une date de retour'
    else if (form.retour && form.retour < today)
      newErrors.retour = 'Cette date est déjà passée'
    else if (form.depart && form.retour && form.retour < addDays(form.depart, minDays))
      newErrors.retour = `Au moins ${jours(minDays)} de location`

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setShake(true)
      setTimeout(() => setShake(false), 500)
      return
    }

    saveSearch(form)

    setErrors({})
    const params = new URLSearchParams()
    params.set('lieu',   form.lieu)
    params.set('depart', form.depart)
    if (form.retour) params.set('retour', form.retour)
    if (form.categorie && form.categorie !== categories[0]) params.set('categorie', form.categorie)
    navigate(`/resultats?${params.toString()}`)
  }

  return (
    <section className="hero" id="accueil">
      <div className="hero-bg" aria-hidden="true">
        {/* The scene keeps the photo's proportions, so the light beams stay on
            the car's headlights at every screen size. */}
        <div className={`hero-scene${lit ? ' is-lit' : ''}`}>
          <img
            className="hero-scene__img"
            src={HERO_FALLBACK}
            srcSet={HERO_SRCSET}
            sizes={HERO_SIZES}
            alt=""
            onLoad={() => setLit(true)}
            /* LCP element: load it ahead of everything else. Lowercase: React 18
               does not know the camelCase spelling. */
            fetchpriority="high"
            decoding="async"
          />
          <span className="hero-beam hero-beam--left" />
          <span className="hero-beam hero-beam--right" />
        </div>
        <div className="hero-shade" />
      </div>

      <div className="container hero-content">
        <div className="hero-intro">
          <h1 className="hero-title">
            Conduisez avec<br />
            <span className="gradient-text">Style & Liberté</span>
          </h1>

          <p className="hero-subtitle">
            Découvrez notre gamme exceptionnelle de véhicules. De la citadine élégante au SUV luxueux,
            YASSIR CARS vous offre la meilleure expérience de location au Maroc.
          </p>
        </div>

        <div className="booking-card" id="reserver">
          <div className="booking-head">
            <h2 className="booking-heading">Réservez votre véhicule</h2>
            <p className={`booking-hint${length ? ' is-set' : ''}`} aria-live="polite">
              <Icon name="clock" />
              {length ? `${jours(length)} de location` : `Location dès ${jours(minDays)}`}
            </p>
          </div>

          <form className={`booking-form ${shake ? 'form-shake' : ''}`} onSubmit={handleSubmit}>
            <div className="bk-fields bk-fields--tall">
              <SearchField id="lieu" icon="pin" label="Lieu de prise en charge" error={errors.lieu}>
                <CityMenu
                  value={form.lieu}
                  onChange={(city) => {
                    setForm(f => { const next = { ...f, lieu: city }; saveSearch(next); return next })
                    if (errors.lieu) setErrors(prev => ({ ...prev, lieu: '' }))
                  }}
                  cities={moroccanCities}
                  className="smenu--dark"
                  flip
                />
              </SearchField>

              <SearchField id="depart" icon="calendar" label="Date de début" error={errors.depart}>
                <DatePicker
                  value={form.depart}
                  onChange={(iso) => {
                    setForm(f => { const next = { ...f, depart: iso }; saveSearch(next); return next })
                    if (errors.depart) setErrors(prev => ({ ...prev, depart: '' }))
                    setOpenRetour(n => n + 1)
                  }}
                  min={today}
                  placeholder="Choisir une date"
                  flip
                />
              </SearchField>

              <SearchField id="retour" icon="calendar" label="Date de retour" error={errors.retour}>
                <DatePicker
                  value={form.retour}
                  onChange={(iso) => {
                    setForm(f => { const next = { ...f, retour: iso }; saveSearch(next); return next })
                    if (errors.retour) setErrors(prev => ({ ...prev, retour: '' }))
                  }}
                  min={form.depart ? addDays(form.depart, minDays) : today}
                  highlight={form.depart || undefined}
                  openKey={openRetour}
                  placeholder="Choisir une date"
                  flip
                />
              </SearchField>

              <SearchField id="categorie" icon="car" label="Catégorie">
                <SelectMenu
                  value={form.categorie === categories[0] ? '' : form.categorie}
                  onChange={(v) => setForm(f => { const next = { ...f, categorie: v }; saveSearch(next); return next })}
                  options={categoryOptions}
                  ariaLabel="Catégorie"
                  className="smenu--dark"
                  flip
                />
              </SearchField>
            </div>

            <button type="submit" className="btn btn-accent booking-submit">
              <span>Rechercher<span className="booking-submit__more"> un véhicule</span></span>
              <svg className="booking-submit__arrow" viewBox="0 0 24 24" width="18" height="18" fill="none"
                stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"
                focusable="false" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </form>
        </div>

        <div className="hero-foot">
          <ul className="hero-stats">
            {stats.map(s => (
              <li className="stat" key={s.label}>
                <span className="stat-num">{s.num}</span>
                <span className="stat-label">{s.label}</span>
              </li>
            ))}
          </ul>

          <button type="button" className="hero-next" onClick={() => scrollToSection('marques')}>
            <span className="hero-next__label">Découvrir</span>
            <span className="hero-next__icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
                strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" focusable="false" aria-hidden="true">
                <path d="M12 5v14M6 13l6 6 6-6" />
              </svg>
            </span>
          </button>
        </div>
      </div>
    </section>
  )
}
