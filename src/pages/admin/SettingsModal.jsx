import { useState, useEffect } from 'react'
import { showError } from '../../components/AdminDialog'
import { updateSettings } from '../../lib/settings'
import { useSettings } from '../../lib/SettingsContext'
import { fetchCarsAdmin } from '../../lib/cars'
import { colorName } from '../../data'

/* ── Admin settings: phone/WhatsApp, social links, minimum rental length ───── */
export default function SettingsModal({ onClose }) {
  const { settings, reload } = useSettings()
  const [form, setForm] = useState({
    whatsapp: settings.whatsapp || '',
    phone: settings.phone || '',
    contactEmail: settings.contactEmail || '',
    address: settings.address || '',
    instagramUrl: settings.instagramUrl || '',
    facebookUrl: settings.facebookUrl || '',
    tiktokUrl: settings.tiktokUrl || '',
    minRentalDays: settings.minRentalDays || 3,
    discountRate: settings.discountRate ?? 30,
    discountActive: settings.discountActive ?? true,
    discountAllCars: settings.discountAllCars ?? true,
    discountCarIds: settings.discountCarIds ?? [],
  })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  // Fleet list for the promotion picker. Admin-only read, so it's the full list
  // of physical cars — the same granularity the promotion is stored at.
  const [cars, setCars] = useState([])
  const [carsLoading, setCarsLoading] = useState(true)
  useEffect(() => {
    let alive = true
    fetchCarsAdmin()
      .then(list => { if (alive) setCars(list) })
      .catch(() => { if (alive) setCars([]) })
      .finally(() => { if (alive) setCarsLoading(false) })
    return () => { alive = false }
  }, [])

  const allIds = cars.map(c => String(c.id))
  // "All cars" is stored as a flag rather than a snapshot of ids, so cars added
  // later are included automatically.
  const isPicked = (id) => form.discountAllCars || form.discountCarIds.includes(String(id))
  const pickedCount = form.discountAllCars ? allIds.length : form.discountCarIds.length
  const allPicked = form.discountAllCars || (allIds.length > 0 && pickedCount === allIds.length)

  const toggleCar = (id) => {
    const sid = String(id)
    setForm(f => {
      // Leaving "toutes les voitures" freezes the current selection into a list,
      // minus the one just unticked.
      const base = f.discountAllCars ? allIds : f.discountCarIds
      const next = base.includes(sid) ? base.filter(x => x !== sid) : [...base, sid]
      return { ...f, discountAllCars: false, discountCarIds: next }
    })
  }

  const toggleAll = () => setForm(f => (
    allPicked
      ? { ...f, discountAllCars: false, discountCarIds: [] }
      : { ...f, discountAllCars: true,  discountCarIds: [] }
  ))

  // Keep only digits as the user types a phone number.
  const setDigits = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value.replace(/\D/g, '') }))

  const save = async () => {
    if (!form.whatsapp.trim()) return showError('Indiquez le numéro WhatsApp.')
    if (Number(form.minRentalDays) < 1) return showError('La durée minimale doit être d’au moins 1 jour.')
    const rate = Number(form.discountRate)
    if (form.discountActive) {
      if (!Number.isFinite(rate) || rate < 1 || rate > 99)
        return showError('La remise doit être comprise entre 1 et 99 %.')
      if (!form.discountAllCars && form.discountCarIds.length === 0)
        return showError('Choisissez au moins une voiture, ou désactivez la promotion.')
    }
    setBusy(true)
    try {
      await updateSettings(form)
      await reload()
      onClose()
    } catch (e) { showError('Erreur : ' + e.message) }
    setBusy(false)
  }

  return (
    <div className="admin-modal" onClick={e => { if (e.target.classList.contains('admin-modal')) onClose() }}>
      <div className="admin-resa-popup">
        <div className="admin-resa-popup__head">
          <h3>⚙️ Réglages du site</h3>
          <button className="phone-modal__close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <div className="admin-resa-grid">
          <label className="resa-full">Numéro WhatsApp
            <input
              type="tel" inputMode="numeric"
              value={form.whatsapp}
              onChange={setDigits('whatsapp')}
              placeholder="212661234567"
              autoFocus
            />
            <small className="admin-hint">Format international, sans le 0 (Maroc : 0661… → 212661…). Sert au bouton « Réserver via WhatsApp ».</small>
          </label>

          <label className="resa-full">Numéro de téléphone (appels)
            <input
              type="tel" inputMode="numeric"
              value={form.phone}
              onChange={setDigits('phone')}
              placeholder="212522123456"
            />
            <small className="admin-hint">Même format international. Laissez vide pour masquer le bouton « Appeler » — mieux qu’un faux numéro.</small>
          </label>

          <label className="resa-full">Email de contact
            <input
              type="email"
              value={form.contactEmail}
              onChange={set('contactEmail')}
              placeholder="contact@votre-domaine.ma"
            />
            <small className="admin-hint">Laissez vide pour masquer l’email sur le site.</small>
          </label>

          <label className="resa-full">Adresse
            <input
              type="text"
              value={form.address}
              onChange={set('address')}
              placeholder="12 Boulevard Mohammed V, Casablanca"
            />
            <small className="admin-hint">Affichée dans le bloc « Contact ». Laissez vide pour la masquer.</small>
          </label>

          <label className="resa-full">Lien Instagram
            <input type="url" value={form.instagramUrl} onChange={set('instagramUrl')} placeholder="https://instagram.com/votre_compte" />
          </label>

          <label className="resa-full">Lien Facebook
            <input type="url" value={form.facebookUrl} onChange={set('facebookUrl')} placeholder="https://facebook.com/votre_page" />
          </label>

          <label className="resa-full">Lien TikTok
            <input type="url" value={form.tiktokUrl} onChange={set('tiktokUrl')} placeholder="https://tiktok.com/@votre_compte" />
          </label>

          <label className="resa-full">Durée minimale de location (jours)
            <input
              type="number" min="1"
              value={form.minRentalDays}
              onChange={e => setForm(f => ({ ...f, minRentalDays: e.target.value }))}
            />
            <small className="admin-hint">Nombre de jours minimum entre la date de début et de fin sur tout le site.</small>
          </label>

          {/* ── Promotion ─────────────────────────────────────────────── */}
          <div className="resa-full promo-box">
            <div className="promo-box__head">
              <div>
                <strong className="promo-box__title">Remise promotionnelle</strong>
                <small className="admin-hint">
                  {form.discountActive
                    ? 'La remise est appliquée aux prix affichés sur le site.'
                    : 'Promotion désactivée — les prix normaux sont affichés partout.'}
                </small>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.discountActive}
                className={`promo-switch ${form.discountActive ? 'is-on' : ''}`}
                onClick={() => setForm(f => ({ ...f, discountActive: !f.discountActive }))}
              >
                <span className="promo-switch__knob" />
              </button>
            </div>

            {form.discountActive && (
              <>
                <label className="promo-box__rate">Pourcentage de remise
                  <div className="promo-rate-wrap">
                    <input
                      type="number" min="1" max="99"
                      value={form.discountRate}
                      onChange={e => setForm(f => ({ ...f, discountRate: e.target.value }))}
                    />
                    <span className="promo-rate-suffix">%</span>
                  </div>
                </label>

                <div className="promo-cars">
                  <div className="promo-cars__head">
                    <span className="promo-cars__label">
                      Voitures concernées
                      <em className="promo-cars__count">
                        {form.discountAllCars
                          ? 'toutes les voitures'
                          : `${pickedCount} sur ${allIds.length}`}
                      </em>
                    </span>
                    <button type="button" className="admin-btn admin-btn--sm" onClick={toggleAll}>
                      {allPicked ? 'Tout désélectionner' : 'Tout sélectionner'}
                    </button>
                  </div>

                  {carsLoading ? (
                    <p className="admin-hint promo-cars__empty">Chargement de la flotte…</p>
                  ) : cars.length === 0 ? (
                    <p className="admin-hint promo-cars__empty">Aucune voiture dans la flotte.</p>
                  ) : (
                    <div className="promo-cars__list">
                      {cars.map(c => (
                        <label className={`promo-car ${isPicked(c.id) ? 'is-on' : ''}`} key={c.id}>
                          <input
                            type="checkbox"
                            checked={isPicked(c.id)}
                            onChange={() => toggleCar(c.id)}
                          />
                          {c.color && <span className="promo-car__dot" style={{ background: c.color }} />}
                          <span className="promo-car__name">
                            {c.name}
                            {c.color && <em> · {colorName(c.color)}</em>}
                          </span>
                          <span className="promo-car__price">
                            {Number(c.price).toLocaleString('fr-FR')} {c.currency}
                            {isPicked(c.id) && Number(form.discountRate) > 0 && (
                              <strong> → {Math.round(Number(c.price) * (1 - Number(form.discountRate) / 100)).toLocaleString('fr-FR')}</strong>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  {!form.discountAllCars && pickedCount === 0 && (
                    <p className="admin-hint promo-cars__warn">
                      Aucune voiture sélectionnée : la promotion ne s’affichera nulle part.
                    </p>
                  )}
                  {form.discountAllCars && (
                    <p className="admin-hint promo-cars__note">
                      Les voitures ajoutées plus tard seront incluses automatiquement.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="admin-resa-actions">
          <button className="admin-btn admin-btn--sm" onClick={onClose} disabled={busy}>Annuler</button>
          <button className="admin-btn admin-btn--sm admin-btn--primary" onClick={save} disabled={busy}>
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}
