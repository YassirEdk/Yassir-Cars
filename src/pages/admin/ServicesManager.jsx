import { useState } from 'react'
import { showError, confirmAsync } from '../../components/AdminDialog'
import { fetchCarServices, addCarService, deleteCarService } from '../../lib/cars'
import { Ico } from './Icons'
import { formatKm, formatDate } from './format'
import ListFilters from './ListFilters'

const COMMON_SERVICES = [
  'Vidange', 'Freins', 'Pneus', 'Filtre à huile', 'Filtre à air', 'Révision',
  'Climatisation', 'Batterie', 'Courroie de distribution', 'Bougies', 'Embrayage', 'Autre',
]
const EMPTY_SERVICE = { service: '', date: '', mileage: '', cost: '', note: '' }

/* ── Pop-up: all services with search + date range ────────────────────────── */
function ServicesModal({ services, onClose, onRemove }) {
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const filtered = services.filter(s => {
    const text = `${s.service || ''} ${s.note || ''}`.toLowerCase()
    if (q && !text.includes(q.trim().toLowerCase())) return false
    if (from && (s.date || '') < from) return false
    if (to && (s.date || '') > to) return false
    return true
  })

  return (
    <div className="admin-modal" onClick={e => { if (e.target.classList.contains('admin-modal')) onClose() }}>
      <div className="admin-list-modal admin-list-modal--wide">
        <div className="admin-list-modal__head">
          <h3>🔧 Tous les services ({services.length})</h3>
          <button className="phone-modal__close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <ListFilters q={q} setQ={setQ} from={from} setFrom={setFrom} to={to} setTo={setTo} placeholder="Type de service, note…" />
        <div className="admin-list-modal__body">
          {filtered.length === 0 ? (
            <p className="admin-muted">Aucun service ne correspond.</p>
          ) : (
            <div className="admin-hist-table-wrap">
              <table className="admin-hist-table admin-hist-table--service">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Date</th>
                    <th>Kilométrage</th>
                    <th>Coût</th>
                    <th>Note</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s.id}>
                      <td><strong>{s.service}</strong></td>
                      <td className="admin-hist-table__dates">{s.date ? formatDate(s.date) : '—'}</td>
                      <td>{s.mileage != null ? formatKm(s.mileage) + ' km' : '—'}</td>
                      <td>{s.cost != null ? s.cost.toLocaleString('fr-FR') + ' MAD' : '—'}</td>
                      <td>{s.note || '—'}</td>
                      <td><button onClick={() => onRemove(s.id)} className="admin-link-del">Supprimer</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ServicesManager({ car, onKmUpdate }) {
  const [expanded, setExpanded] = useState(false)
  const [services, setServices] = useState(null)  // null = not loaded yet
  const [open, setOpen] = useState(false)          // add form open
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_SERVICE)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const load = async () => {
    try { setServices(await fetchCarServices(car.id)) }
    catch (e) { showError('Erreur : ' + e.message) }
  }
  const toggle = () => {
    const next = !expanded
    setExpanded(next)
    if (next && services === null) load()
  }
  const save = async () => {
    if (!form.service.trim()) return showError('Indiquez le type de service.')
    setBusy(true)
    try {
      await addCarService(car.id, form)
      if (form.mileage) onKmUpdate(car.id, Number(form.mileage))
      setForm(EMPTY_SERVICE); setOpen(false); load()
    } catch (e) { showError('Erreur : ' + e.message) }
    setBusy(false)
  }
  const remove = async (id) => {
    if (!await confirmAsync('Supprimer ce service ?', { confirmLabel: 'Supprimer', danger: true })) return
    try { await deleteCarService(id); load() }
    catch (e) { showError('Erreur : ' + e.message) }
  }

  const count = services?.length ?? 0
  const todayMs = Date.now()
  // Sort by closest date to today first (smallest absolute distance in ms).
  const sortedServices = [...(services ?? [])].sort((a, b) => {
    const distA = a.date ? Math.abs(new Date(a.date) - todayMs) : Infinity
    const distB = b.date ? Math.abs(new Date(b.date) - todayMs) : Infinity
    return distA - distB
  })
  const shownServices = sortedServices.slice(0, 3)

  return (
    <div className="admin-services">
      <div className="admin-services__head">
        <button className="admin-services__toggle" onClick={toggle}>
          <Ico name="wrench" /> Services voiture{services ? ` (${count})` : ''} <span className="admin-services__chev">{expanded ? '▲' : '▼'}</span>
        </button>
        {expanded && (
          <button className="admin-btn admin-btn--sm admin-btn--primary" onClick={() => setOpen(true)}>
            ➕ Ajouter un service
          </button>
        )}
      </div>

      {expanded && (
        <div className="admin-services__body">
          {services === null ? (
            <p className="admin-muted">Chargement…</p>
          ) : (
            <>
              {count === 0 && <p className="admin-muted">Aucun service enregistré.</p>}

              {count > 0 && (
                <div className="admin-hist-table-wrap">
                  <table className="admin-hist-table admin-hist-table--service">
                    <thead>
                      <tr>
                        <th>Service</th>
                        <th>Date</th>
                        <th>Kilométrage</th>
                        <th>Coût</th>
                        <th>Note</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {shownServices.map(s => (
                        <tr key={s.id}>
                          <td><strong>{s.service}</strong></td>
                          <td className="admin-hist-table__dates">{s.date ? formatDate(s.date) : '—'}</td>
                          <td>{s.mileage != null ? formatKm(s.mileage) + ' km' : '—'}</td>
                          <td>{s.cost != null ? s.cost.toLocaleString('fr-FR') + ' MAD' : '—'}</td>
                          <td>{s.note || '—'}</td>
                          <td><button onClick={() => remove(s.id)} className="admin-link-del">Supprimer</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {count >= 4 && (
                <button className="admin-btn admin-btn--sm admin-all-btn" onClick={() => setModalOpen(true)}>
                  🔧 Voir tous les services ({count})
                </button>
              )}

              {modalOpen && (
                <ServicesModal
                  services={services ?? []}
                  onClose={() => setModalOpen(false)}
                  onRemove={remove}
                />
              )}

              {open && (
                <div className="admin-modal" style={{ zIndex: 1200 }} onClick={e => { if (e.target.classList.contains('admin-modal')) { setOpen(false); setForm(EMPTY_SERVICE) } }}>
                  <div className="admin-resa-popup">
                    <div className="admin-resa-popup__head">
                      <h3>🔧 Nouveau service — {car.name}</h3>
                      <button className="phone-modal__close" onClick={() => { setOpen(false); setForm(EMPTY_SERVICE) }} aria-label="Fermer">✕</button>
                    </div>
                    <div className="admin-resa-grid">
                      <label className="resa-full">Type de service *
                        <input list={`svc-${car.id}`} value={form.service} onChange={set('service')} placeholder="Vidange, Freins…" autoFocus />
                        <datalist id={`svc-${car.id}`}>
                          {COMMON_SERVICES.map(s => <option key={s} value={s} />)}
                        </datalist>
                      </label>
                      <label>Date
                        <input type="date" value={form.date} onChange={set('date')} />
                      </label>
                      <label>Kilométrage (km)
                        <input
                          type="text" inputMode="numeric"
                          value={formatKm(form.mileage)}
                          onChange={e => setForm(f => ({ ...f, mileage: e.target.value.replace(/\D/g, '') }))}
                        />
                      </label>
                      <label>Coût (MAD)
                        <input type="number" min="0" value={form.cost} onChange={set('cost')} />
                      </label>
                      <label className="resa-full">Note
                        <input type="text" value={form.note} onChange={set('note')} placeholder="Garage, pièces changées…" />
                      </label>
                    </div>
                    <div className="admin-resa-actions">
                      <button className="admin-btn admin-btn--sm" onClick={() => { setOpen(false); setForm(EMPTY_SERVICE) }}>Annuler</button>
                      <button className="admin-btn admin-btn--sm admin-btn--primary" onClick={save} disabled={busy}>
                        {busy ? 'Enregistrement…' : 'Enregistrer le service'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
