import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { moroccanCities, addDays, colorName } from '../data'
import { useSettings } from '../lib/SettingsContext'
import { fetchCars, mergeByModel, isCarAvailable } from '../lib/cars'
import CityWheel from './CityWheel'
import DatePicker from './DatePicker'
import Icon from './Icon'

// Photos of a unit, falling back to its single cover photo.
const galleryOf = (u) => (u.photos?.length ? u.photos : (u.photo ? [u.photo] : []))

// "2026-07-22" → "22/07/2026"
const fmtDate = (iso) => (iso ? iso.split('-').reverse().join('/') : '')

/*
  Popup opened from a car card. Collects ville + date début + date fin
  (same three fields as the hero search bar), then:

  - mode="search"  → sends the user to the results page filtered to THIS car.
  - mode="reserve" → checks the car's own availability for those dates. Free →
    straight to the booking page; taken → an "indisponible" step listing the
    other cars of the fleet that ARE free for the same dates.
*/
export default function AvailabilityModal({ car, onClose, mode = 'search', initialColor = null }) {
  const overlayRef = useRef(null)
  const navigate = useNavigate()
  const { settings } = useSettings()
  const minDays = settings.minRentalDays
  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({ lieu: '', depart: '', retour: '' })
  const [errors, setErrors] = useState({})
  const [step, setStep] = useState('form')          // 'form' | 'unavailable'
  const [checking, setChecking] = useState(false)
  // Bumped when a start date is picked, so the end calendar opens by itself.
  const [openRetour, setOpenRetour] = useState(0)
  const [suggestions, setSuggestions] = useState([]) // [{ model, unit }]

  const setField = (k) => (v) => {
    setForm(f => ({ ...f, [k]: v }))
    if (errors[k]) setErrors(prev => ({ ...prev, [k]: '' }))
  }

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  // Send the user to the booking form with everything pre-filled.
  const goReserve = (model, unit) => {
    const gallery = galleryOf(unit)
    navigate('/reserver', {
      state: {
        nom: model.name,
        couleur: unit.color ? colorName(unit.color) : '',
        photo: gallery[0] || '',
        photos: gallery,
        features: unit.features ?? [],
        prix: unit.price,
        depart: form.depart,
        retour: form.retour,
        lieu: form.lieu,
      },
    })
  }

  // Whole fleet on the results page, carrying the ville + dates chosen here.
  const goAllResults = () => {
    const params = new URLSearchParams()
    params.set('lieu', form.lieu)
    params.set('depart', form.depart)
    params.set('retour', form.retour)
    navigate(`/resultats?${params.toString()}`)
  }

  // Every category a model belongs to (falls back to its main one).
  const catsOf = (m) => (m.categories?.length ? m.categories : [m.category]).filter(Boolean)
  const sharesCategory = (m) => {
    const mine = catsOf(car)
    return catsOf(m).some(c => mine.includes(c))
  }

  /*
    Alternatives for the chosen dates, best match first:
      1. the SAME model in another colour (a different physical unit),
      2. a different model in the same category,
      3. anything else that's free.
  */
  const loadSuggestions = async () => {
    try {
      const models = mergeByModel(await fetchCars())
      const free = (u) => isCarAvailable(u, form.depart, form.retour)
      const sameModel = []
      const sameCat = []
      const rest = []

      for (const m of models) {
        const units = m.units ?? [m]
        if (m.name.trim().toLowerCase() === car.name.trim().toLowerCase()) {
          // Every free colour of this model is its own suggestion.
          for (const u of units.filter(free)) {
            sameModel.push({ model: m, unit: u, tag: `Même modèle · ${colorName(u.color)}` })
          }
          continue
        }
        const unit = units.find(free)
        if (!unit) continue
        if (sharesCategory(m)) sameCat.push({ model: m, unit, tag: 'Même catégorie' })
        else rest.push({ model: m, unit, tag: null })
      }

      setSuggestions([...sameModel, ...sameCat, ...rest].slice(0, 4))
    } catch {
      setSuggestions([])
    }
  }

  const validate = () => {
    const errs = {}
    if (!form.lieu) errs.lieu = 'Choisissez une ville'
    if (!form.depart) errs.depart = 'Choisissez une date de début'
    else if (form.depart < today) errs.depart = 'Date dans le passé'
    if (!form.retour) errs.retour = 'Choisissez une date de fin'
    else if (form.depart && form.retour < addDays(form.depart, minDays))
      errs.retour = `La location doit durer au moins ${minDays} jours`
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    if (mode === 'search') {
      const params = new URLSearchParams()
      params.set('lieu', form.lieu)
      params.set('depart', form.depart)
      params.set('retour', form.retour)
      params.set('car', car.id)          // ← results page shows only this car
      navigate(`/resultats?${params.toString()}`)
      return
    }

    // mode="reserve": is the exact unit the user picked on the card free? We
    // don't silently swap to another colour — an available colour shows up as
    // the first suggestion instead, so the change is the user's choice.
    const units = car.units ?? [car]
    const preferred = initialColor ? units.find(u => u.color === initialColor) : null
    const free = preferred
      ? (isCarAvailable(preferred, form.depart, form.retour) ? preferred : null)
      : units.find(u => isCarAvailable(u, form.depart, form.retour))

    if (free) { goReserve(car, free); return }

    setChecking(true)
    await loadSuggestions()
    setChecking(false)
    setStep('unavailable')
  }

  const isWide = step === 'unavailable'

  // Header preview: the colour the user was looking at on the card.
  const heroUnit = (car.units ?? [car]).find(u => u.color === initialColor) ?? car
  const heroPhoto = galleryOf(heroUnit)[0]
  const promo = Math.round(heroUnit.price * 0.7)
  // Live recap once both dates are set.
  const days = (form.depart && form.retour)
    ? Math.max(1, Math.round((new Date(form.retour) - new Date(form.depart)) / 86_400_000))
    : 0

  // Portal to <body>: car cards animate with a transform, which would make the
  // fixed overlay position itself against the card instead of the viewport.
  return createPortal(
    <div
      className={`phone-overlay ${isWide ? 'avail-overlay--wide' : ''}`}
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className={`avail-modal ${isWide ? 'avail-modal--wide' : ''}`}>
        <button className="phone-modal__close" onClick={onClose} aria-label="Fermer">✕</button>

        {step === 'form' ? (
          <>
            <div className="avail-head">
              <div className="avail-head__thumb" style={{ background: heroPhoto ? '#f4f5f7' : heroUnit.brandColor }}>
                {heroPhoto
                  ? <img src={heroPhoto} alt={car.name} />
                  : <span className="avail-head__initial">{car.name.split(' ')[0]}</span>}
              </div>
              <div className="avail-head__txt">
                <span className="avail-head__eyebrow">
                  {mode === 'reserve' ? 'Réservation' : 'Disponibilité'}
                </span>
                <h3 className="avail-head__name">{car.name}</h3>
                <span className="avail-head__price">
                  {promo.toLocaleString('fr-FR')} <small>{heroUnit.currency} / jour</small>
                </span>
              </div>
            </div>

            <form className="avail-modal__form" onSubmit={submit}>
              <div className="form-group">
                <label><Icon name="pin" /> Lieu de prise en charge</label>
                <CityWheel
                  value={form.lieu}
                  onChange={setField('lieu')}
                  cities={moroccanCities}
                  error={!!errors.lieu}
                />
                {errors.lieu && <span className="field-error">Attention: {errors.lieu}</span>}
              </div>

              <div className="avail-modal__dates">
                <div className="form-group">
                  <label><Icon name="calendar" /> Date de début</label>
                  <DatePicker
                    value={form.depart}
                    onChange={(iso) => { setField('depart')(iso); setOpenRetour(n => n + 1) }}
                    min={today}
                    placeholder="Choisir une date"
                    className={errors.depart ? 'input-error' : ''}
                  />
                  {errors.depart && <span className="field-error">Attention: {errors.depart}</span>}
                </div>
                <div className="form-group">
                  <label><Icon name="calendar" /> Date de fin</label>
                  <DatePicker
                    value={form.retour}
                    onChange={setField('retour')}
                    min={form.depart ? addDays(form.depart, minDays) : today}
                    highlight={form.depart || undefined}
                    openKey={openRetour}
                    placeholder="Choisir une date"
                    className={errors.retour ? 'input-error' : ''}
                  />
                  {errors.retour && <span className="field-error">Attention: {errors.retour}</span>}
                </div>
              </div>

              {days > 0 && (
                <div className="avail-recap">
                  <span>{days} jour{days > 1 ? 's' : ''} de location</span>
                  <strong>{(promo * days).toLocaleString('fr-FR')} {heroUnit.currency}</strong>
                </div>
              )}

              <button type="submit" className="btn btn-accent btn-lg avail-modal__btn" disabled={checking}>
                {checking ? 'Vérification…' : mode === 'reserve' ? 'Réserver →' : 'Rechercher →'}
              </button>

              <div className="avail-trust">
                <span>✓ Annulation gratuite</span>
                <span>✓ Assurance incluse</span>
                <span>✓ Km illimité</span>
              </div>
            </form>
          </>
        ) : (
          <>
            <div className="avail-nope">
              <span className="avail-nope__ico" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                  strokeLinecap="round" width="26" height="26">
                  <circle cx="12" cy="12" r="9" />
                  <path d="m15 9-6 6M9 9l6 6" />
                </svg>
              </span>
              <div>
                <h3 className="avail-nope__title">Véhicule non disponible</h3>
                <p className="avail-nope__sub">
                  {car.name}{initialColor ? ` en ${colorName(initialColor)}` : ''} est réservée
                  du {fmtDate(form.depart)} au {fmtDate(form.retour)}.
                </p>
              </div>
            </div>

            {suggestions.length > 0 ? (
              <>
                <p className="avail-sugg__intro">Ces véhicules sont libres pour ces dates :</p>
                <div className="avail-sugg__list">
                  {suggestions.map(({ model, unit, tag }) => {
                    const photo = galleryOf(unit)[0]
                    return (
                      <button
                        type="button"
                        key={unit.id}
                        className="avail-sugg"
                        onClick={() => goReserve(model, unit)}
                      >
                        <span className="avail-sugg__img" style={{ background: photo ? '#f4f5f7' : unit.brandColor }}>
                          {photo
                            ? <img src={photo} alt={model.name} loading="lazy" />
                            : <span className="avail-sugg__initial">{model.name.split(' ')[0]}</span>}
                        </span>
                        <span className="avail-sugg__body">
                          <span className="avail-sugg__name">
                            {model.name}
                            {unit.color && <span className="avail-sugg__dot" style={{ background: unit.color }} />}
                          </span>
                          {tag && <span className="avail-sugg__tag">{tag}</span>}
                          <span className="avail-sugg__specs">
                            {unit.fuel} · {unit.transmission} · {unit.seats} places
                          </span>
                          <span className="avail-sugg__price">
                            {Math.round(unit.price * 0.7).toLocaleString('fr-FR')} {unit.currency} <small>/ jour</small>
                          </span>
                        </span>
                        <span className="avail-sugg__go">→</span>
                      </button>
                    )
                  })}
                </div>
              </>
            ) : (
              <p className="avail-sugg__intro">
                Aucun autre véhicule n'est libre pour ces dates. Essayez d'autres dates.
              </p>
            )}

            <div className="avail-nope__actions">
              <button
                type="button"
                className="btn btn-accent avail-modal__btn"
                onClick={goAllResults}
              >
                Voir toutes les voitures disponibles →
              </button>
              <button
                type="button"
                className="avail-back"
                onClick={() => setStep('form')}
              >
                ← Modifier les dates
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}
