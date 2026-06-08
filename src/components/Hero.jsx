import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DatePicker from './DatePicker'
import CityWheel from './CityWheel'
import Icon from './Icon'
import { moroccanCities, addDays } from '../data'
import { useSettings } from '../lib/SettingsContext'

const HERO_BG = 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1800&q=80'

const tabs = ['Courte durée', 'Longue durée']
const categories = ['Toutes catégories', 'Économique', 'Citadine', 'Berline', 'SUV / 4x4', 'Luxe', 'Utilitaire']

const stats = [
  { num: '500+', label: 'Véhicules' },
  { num: '15+', label: 'Agences' },
  { num: '10K+', label: 'Clients satisfaits' },
  { num: '24/7', label: 'Assistance' },
]

const STORAGE_KEY = 'yassir_search'
const SAVE_TTL = 60 * 60 * 1000 // saved search expires after 1 hour

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    // Drop the saved search once it's older than SAVE_TTL so the fields don't
    // stay filled forever — they clear themselves ~1h after the last search.
    if (!data.savedAt || Date.now() - data.savedAt > SAVE_TTL) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return data
  } catch {
    return null
  }
}

export default function Hero() {
  const saved = loadSaved()
  const [activeTab, setActiveTab] = useState(saved?.tab ?? 0)
  const [form, setForm] = useState({
    lieu:      saved?.lieu      ?? '',
    depart:    saved?.depart    ?? '',
    retour:    saved?.retour    ?? '',
    categorie: saved?.categorie ?? '',
  })
  const [errors, setErrors] = useState({})
  const [shake,  setShake]  = useState(false)
  const navigate = useNavigate()
  const { settings } = useSettings()
  // The « Longue durée » tab (index 1) enforces its own, larger minimum.
  const minDays = activeTab === 1 ? settings.minLongDurationDays : settings.minRentalDays

  const set = (key) => (e) => {
    setForm(f => ({ ...f, [key]: e.target.value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }))
  }

  const today = new Date().toISOString().split('T')[0]

  const handleSubmit = (e) => {
    e.preventDefault()

    const newErrors = {}
    if (!form.lieu.trim())
      newErrors.lieu = 'Veuillez indiquer le lieu de prise en charge'

    if (!form.depart)
      newErrors.depart = 'Veuillez choisir une date de départ'
    else if (form.depart < today)
      newErrors.depart = 'La date de départ ne peut pas être dans le passé'

    if (!form.retour)
      newErrors.retour = 'Veuillez choisir une date de retour'
    else if (form.retour && form.retour < today)
      newErrors.retour = 'La date de retour ne peut pas être dans le passé'
    else if (form.depart && form.retour && form.retour < addDays(form.depart, minDays))
      newErrors.retour = `La location doit durer au moins ${minDays} jours`

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setShake(true)
      setTimeout(() => setShake(false), 500)
      return
    }

    // Persist to localStorage before navigating
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      lieu:      form.lieu,
      depart:    form.depart,
      retour:    form.retour,
      categorie: form.categorie,
      tab:       activeTab,
      savedAt:   Date.now(),
    }))

    setErrors({})
    const params = new URLSearchParams()
    params.set('lieu',   form.lieu)
    params.set('depart', form.depart)
    if (form.retour) params.set('retour', form.retour)
    if (form.categorie && form.categorie !== categories[0]) params.set('categorie', form.categorie)
    params.set('type', tabs[activeTab])
    navigate(`/resultats?${params.toString()}`)
  }

  return (
    <section className="hero" id="accueil">
      <div
        className="hero-bg"
        style={{ backgroundImage: `url('${HERO_BG}')` }}
      >
        <div className="hero-overlay" />
      </div>

      <div className="container hero-content">
        <h1 className="hero-title">
          Conduisez avec<br />
          <span className="gradient-text">Style & Liberté</span>
        </h1>

        <p className="hero-subtitle">
          Découvrez notre gamme exceptionnelle de véhicules. De la citadine élégante au SUV luxueux,
          YASSIR CARS vous offre la meilleure expérience de location au Maroc.
        </p>

        <div className="booking-card" id="reserver">
          <div className="booking-tabs">
            {tabs.map((t, i) => (
              <button
                key={t}
                className={`tab-btn ${activeTab === i ? 'active' : ''}`}
                onClick={() => setActiveTab(i)}
              >
                {t}
              </button>
            ))}
          </div>

          <form className={`booking-form ${shake ? 'form-shake' : ''}`} onSubmit={handleSubmit}>
            <div className="form-row">

              <div className="form-group">
                <label><Icon name="pin" /> Lieu de prise en charge</label>
                <CityWheel
                  value={form.lieu}
                  onChange={(city) => {
                    setForm(f => ({ ...f, lieu: city }))
                    if (errors.lieu) setErrors(prev => ({ ...prev, lieu: '' }))
                  }}
                  cities={moroccanCities}
                  error={!!errors.lieu}
                />
                {errors.lieu && <span className="field-error">Attention: {errors.lieu}</span>}
              </div>

              <div className="form-group">
                <label><Icon name="calendar" /> Date de début</label>
                <DatePicker
                  value={form.depart}
                  onChange={(iso) => {
                    setForm(f => ({ ...f, depart: iso }))
                    if (errors.depart) setErrors(prev => ({ ...prev, depart: '' }))
                  }}
                  min={today}
                  placeholder="Choisir une date"
                  className={errors.depart ? 'input-error' : ''}
                />
                {errors.depart && <span className="field-error">Attention: {errors.depart}</span>}
              </div>

              <div className="form-group">
                <label><Icon name="calendar" /> Date de retour</label>
                <DatePicker
                  value={form.retour}
                  onChange={(iso) => {
                    setForm(f => ({ ...f, retour: iso }))
                    if (errors.retour) setErrors(prev => ({ ...prev, retour: '' }))
                  }}
                  min={form.depart ? addDays(form.depart, minDays) : today}
                  highlight={form.depart || undefined}
                  placeholder="Choisir une date"
                  className={errors.retour ? 'input-error' : ''}
                />
                {errors.retour && <span className="field-error">Attention: {errors.retour}</span>}
              </div>

              <div className="form-group">
                <label><Icon name="car" /> Catégorie</label>
                <select
                  value={form.categorie}
                  onChange={set('categorie')}
                >
                  {categories.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

            </div>
            <button type="submit" className="btn btn-accent btn-lg">
              Rechercher un véhicule →
            </button>
          </form>
        </div>

        <div className="hero-stats">
          {stats.map((s, i) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              {i > 0 && <div className="stat-divider" />}
              <div className="stat">
                <span className="stat-num">{s.num}</span>
                <span className="stat-label">{s.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll hint — pinned to the bottom of the hero */}
      <div className="scroll-hint">
        <span className="scroll-hint__label">Défiler vers le bas</span>

        <div className="scroll-hint__chevrons">
          <span /><span /><span />
        </div>
      </div>
    </section>
  )
}
