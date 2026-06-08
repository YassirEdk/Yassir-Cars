import { useState } from 'react'
import { showError } from '../../components/AdminDialog'
import { updateSettings } from '../../lib/settings'
import { useSettings } from '../../lib/SettingsContext'

/* ── Admin settings: phone/WhatsApp, social links, minimum rental length ───── */
export default function SettingsModal({ onClose }) {
  const { settings, reload } = useSettings()
  const [form, setForm] = useState({
    whatsapp: settings.whatsapp || '',
    instagramUrl: settings.instagramUrl || '',
    facebookUrl: settings.facebookUrl || '',
    tiktokUrl: settings.tiktokUrl || '',
    minRentalDays: settings.minRentalDays || 3,
    minLongDurationDays: settings.minLongDurationDays || 30,
  })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  // Keep only digits as the user types the WhatsApp number.
  const setWhatsapp = (e) => setForm(f => ({ ...f, whatsapp: e.target.value.replace(/\D/g, '') }))

  const save = async () => {
    if (!form.whatsapp.trim()) return showError('Indiquez le numéro WhatsApp.')
    if (Number(form.minRentalDays) < 1) return showError('La durée minimale doit être d’au moins 1 jour.')
    if (Number(form.minLongDurationDays) < 1) return showError('La durée minimale longue durée doit être d’au moins 1 jour.')
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
              onChange={setWhatsapp}
              placeholder="212661234567"
              autoFocus
            />
            <small className="admin-hint">Format international, sans le 0 (Maroc : 0661… → 212661…). Sert au bouton « Réserver via WhatsApp ».</small>
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
            <small className="admin-hint">Nombre de jours minimum entre la date de début et de fin sur tout le site (courte durée).</small>
          </label>

          <label className="resa-full">Durée minimale — Longue durée (jours)
            <input
              type="number" min="1"
              value={form.minLongDurationDays}
              onChange={e => setForm(f => ({ ...f, minLongDurationDays: e.target.value }))}
            />
            <small className="admin-hint">Nombre de jours minimum exigé lorsque l’onglet « Longue durée » est sélectionné sur la page d’accueil.</small>
          </label>
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
