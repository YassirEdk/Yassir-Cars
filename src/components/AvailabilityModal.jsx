import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { moroccanCities } from '../data'

/*
  Popup opened from a car card's "Vérifier la disponibilité" button.
  Collects ville + date début + date fin, then sends the user to the
  results page filtered to THIS car only (via ?car=<id>).
*/
export default function AvailabilityModal({ car, onClose }) {
  const overlayRef = useRef(null)
  const navigate = useNavigate()
  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({ lieu: '', depart: '', retour: '' })
  const [errors, setErrors] = useState({})

  const set = (k) => (e) => {
    setForm(f => ({ ...f, [k]: e.target.value }))
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

  const submit = (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.lieu) errs.lieu = 'Choisissez une ville'
    if (!form.depart) errs.depart = 'Choisissez une date de début'
    else if (form.depart < today) errs.depart = 'Date dans le passé'
    if (!form.retour) errs.retour = 'Choisissez une date de fin'
    else if (form.retour < form.depart) errs.retour = 'La date de fin doit être après le départ'

    if (Object.keys(errs).length) { setErrors(errs); return }

    const params = new URLSearchParams()
    params.set('lieu', form.lieu)
    params.set('depart', form.depart)
    params.set('retour', form.retour)
    params.set('car', car.id)          // ← results page shows only this car
    navigate(`/resultats?${params.toString()}`)
  }

  return (
    <div
      className="phone-overlay"
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="avail-modal">
        <button className="phone-modal__close" onClick={onClose} aria-label="Fermer">✕</button>

        <h3 className="avail-modal__title">Vérifier la disponibilité</h3>
        <p className="avail-modal__car">{car.name}</p>

        <form className="avail-modal__form" onSubmit={submit}>
          <div className="form-group">
            <label>📍 Lieu de prise en charge</label>
            <select value={form.lieu} onChange={set('lieu')} className={errors.lieu ? 'avail-err' : ''}>
              <option value="" disabled>Choisissez une ville…</option>
              {moroccanCities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.lieu && <span className="field-error">⚠ {errors.lieu}</span>}
          </div>

          <div className="avail-modal__dates">
            <div className="form-group">
              <label>📅 Date de début</label>
              <input type="date" min={today} value={form.depart} onChange={set('depart')} className={errors.depart ? 'avail-err' : ''} />
              {errors.depart && <span className="field-error">⚠ {errors.depart}</span>}
            </div>
            <div className="form-group">
              <label>📅 Date de finr</label>
              <input type="date" min={form.depart || today} value={form.retour} onChange={set('retour')} className={errors.retour ? 'avail-err' : ''} />
              {errors.retour && <span className="field-error">⚠ {errors.retour}</span>}
            </div>
          </div>

          <button type="submit" className="btn btn-accent btn-lg avail-modal__btn">
            Rechercher →
          </button>
        </form>
      </div>
    </div>
  )
}
