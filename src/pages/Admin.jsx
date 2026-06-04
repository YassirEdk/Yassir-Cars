import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import DatePicker from '../components/DatePicker'
import { DialogHost, showError, confirmAsync } from '../components/AdminDialog'
import { carColors, colorName } from '../data'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import {
  fetchCars, createCar, updateCar, deleteCar,
  uploadCarPhotos, addReservation, updateReservation, deletePeriod,
  confirmPickup, confirmReturn, updateDepartureKm, findCinConflict, findCinDamage,
  fetchCarServices, addCarService, deleteCarService,
} from '../lib/cars'
import './admin.css'

const CATEGORIES = [
  { value: 'economique', label: 'Économique' },
  { value: 'citadine',   label: 'Citadine' },
  { value: 'berline',    label: 'Berline' },
  { value: 'suv',        label: 'SUV / 4x4' },
  { value: 'luxe',       label: 'Luxe' },
  { value: 'utilitaire', label: 'Utilitaire' },
]
const EMPTY_CAR = {
  name: '', category: 'economique', categories: ['economique'], photo: '', photos: [],
  brandLogo: '', brandColor: '#1a1a1a', whiteFilter: false,
  price: 250, currency: 'MAD', fuel: 'Diesel', transmission: 'Manuel',
  seats: 5, extra: 'Clim', badge: '', sortOrder: 0,
  color: '', immatriculation: '', damaged: false,
}

/* ── Login screen ─────────────────────────────────────────────────────────── */
function Login({ onAuthed }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) setError(error.message)
    else onAuthed()
  }

  return (
    <div className="admin-login">
      <form className="admin-login__card" onSubmit={submit}>
        <h1>🔐 Espace Admin</h1>
        <p className="admin-login__sub">YASSIR CARS — gestion de la flotte</p>
        <label>Email
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
        </label>
        <label>Mot de passe
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </label>
        {error && <div className="admin-error">{error}</div>}
        <button className="admin-btn admin-btn--primary" disabled={busy}>
          {busy ? 'Connexion…' : 'Se connecter'}
        </button>
        <Link to="/" className="admin-login__back">← Retour au site</Link>
      </form>
    </div>
  )
}

/* ── Car services (maintenance log) panel ─────────────────────────────────── */
const COMMON_SERVICES = [
  'Vidange', 'Freins', 'Pneus', 'Filtre à huile', 'Filtre à air', 'Révision',
  'Climatisation', 'Batterie', 'Courroie de distribution', 'Bougies', 'Embrayage', 'Autre',
]
const EMPTY_SERVICE = { service: '', date: '', mileage: '', cost: '', note: '' }

// Show a number grouped by thousands with dots: 152687 → "152.687".
const formatKm = (val) => {
  const d = String(val ?? '').replace(/\D/g, '')
  return d ? d.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''
}

// Show an ISO date (2026-10-16) as JJ/MM/AAAA → "16/10/2026".
const formatDate = (iso) => {
  if (!iso) return ''
  const [y, m, d] = String(iso).split('-')
  return (y && m && d) ? `${d}/${m}/${y}` : iso
}

// Crisp vector icons (Lucide-style) — inherit the surrounding text colour.
const ICONS = {
  wrench:   <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  gauge:    <><path d="m12 14 4-4" /><path d="M3.34 19a10 10 0 1 1 17.32 0" /></>,
  money:    <><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01M18 12h.01" /></>,
  note:     <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h6" /></>,
  user:     <><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  car:      <><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" /><circle cx="7" cy="17" r="2" /><path d="M9 17h6" /><circle cx="17" cy="17" r="2" /></>,
  phone:    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />,
  id:       <><rect width="18" height="14" x="3" y="5" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M15 9h3M15 13h3M6 15a3 3 0 0 1 6 0" /></>,
  globe:    <><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20" /></>,
  logout:   <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></>,
  carplus:  <><path d="M5 17H3c-.6 0-1-.4-1-1v-3c0-.9.7-1.7 1.5-1.9C5.3 10.6 8 10 8 10s1.3-1.4 2.2-2.3c.5-.4 1.1-.7 1.8-.7h2" /><circle cx="7" cy="17" r="2" /><path d="M9 17h5" /><circle cx="16" cy="17" r="2" /><path d="M19 8v6M16 11h6" /></>,
}
function Ico({ name }) {
  return (
    <svg className="svc-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICONS[name]}
    </svg>
  )
}

/* ── Reusable filter bar (search + date range) for the list pop-ups ───────── */
function ListFilters({ q, setQ, from, setFrom, to, setTo, placeholder }) {
  return (
    <div className="admin-list-modal__filters">
      <input className="admin-search" type="search" placeholder={placeholder} value={q} onChange={e => setQ(e.target.value)} />
      <label>Du <DatePicker value={from} onChange={setFrom} placeholder="JJ-MMM-AAAA" allowPast /></label>
      <label>Au <DatePicker value={to} onChange={setTo} min={from || undefined} placeholder="JJ-MMM-AAAA" allowPast /></label>
      {(q || from || to) && (
        <button className="admin-btn admin-btn--sm" onClick={() => { setQ(''); setFrom(''); setTo('') }}>Réinitialiser</button>
      )}
    </div>
  )
}

/* ── Shared client/date/contact info block for a reservation row ──────────── */
// `flow` switches from the fixed column grid (used in the Réservations list so
// rows line up) to a wrapping flex (used where extra km chips appear).
function ResaInfo({ r, flow, children }) {
  return (
    <div className={`admin-resa-item ${flow ? 'admin-resa-item--flow' : ''}`}>
      <strong><Ico name="user" /> {r.clientName || 'Client'}</strong>
      <span className="svc-chip svc-chip--date"><Ico name="calendar" /> {formatDate(r.start)} → {formatDate(r.end)}</span>
      {r.tel && <span className="svc-chip svc-chip--tel"><Ico name="phone" /> {r.tel}</span>}
      {r.cin && <span className="svc-chip svc-chip--cin"><Ico name="id" /> {r.cin}</span>}
      {children}
    </div>
  )
}

// Inline odometer field shown when confirming a pick-up or a return.
// When `withDamage` is set, also shows a "car came back damaged" checkbox and
// passes its value to onSubmit(km, damaged).
function KmConfirm({ label, actionLabel, onSubmit, onCancel, withDamage }) {
  const [km, setKm] = useState('')
  const [damaged, setDamaged] = useState(false)
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    if (km === '') return showError('Indiquez le kilométrage.')
    setBusy(true)
    try { await onSubmit(km, damaged) }
    catch (e) { showError('Erreur : ' + e.message); setBusy(false) }
  }
  return (
    <div className="admin-km-confirm">
      <label><Ico name="gauge" /> {label}
        <input
          type="text" inputMode="numeric" autoFocus
          value={formatKm(km)}
          onChange={e => setKm(e.target.value.replace(/\D/g, ''))}
          placeholder="ex: 152.687"
          onKeyDown={e => { if (e.key === 'Enter') submit() }}
        />
      </label>
      {withDamage && (
        <label className="admin-km-confirm__damage">
          <input type="checkbox" checked={damaged} onChange={e => setDamaged(e.target.checked)} />
          <span>🛠 La voiture est endommagée</span>
        </label>
      )}
      <div className="admin-km-confirm__actions">
        <button className="admin-btn admin-btn--sm" onClick={onCancel} disabled={busy}>Annuler</button>
        <button className="admin-btn admin-btn--sm admin-btn--primary" onClick={submit} disabled={busy}>
          {busy ? '…' : actionLabel}
        </button>
      </div>
    </div>
  )
}

// Distance covered during a finished rental (null if we can't compute it).
const kmDone = (r) =>
  (r.returnKm != null && r.departureKm != null && r.returnKm >= r.departureKm)
    ? r.returnKm - r.departureKm
    : null

// The km chips shown for in-progress / finished rentals.
function KmChips({ r }) {
  return (
    <>
      {r.departureKm != null && (
        <span className="svc-chip svc-chip--km"><Ico name="gauge" /> Départ {formatKm(r.departureKm)} km</span>
      )}
      {r.returnKm != null && (
        <span className="svc-chip svc-chip--km"><Ico name="gauge" /> Retour {formatKm(r.returnKm)} km</span>
      )}
      {kmDone(r) != null && (
        <span className="svc-chip svc-chip--dist"><Ico name="car" /> {formatKm(kmDone(r))} km parcourus</span>
      )}
    </>
  )
}

/* ── Pop-up: all reservations / rental history with search + date range ───── */
function ReservationsModal({ title, reservations, onClose, onRemove, removeLabel = 'Annuler', history = false }) {
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const filtered = reservations.filter(r => {
    const text = `${r.clientName || ''} ${r.cin || ''} ${r.tel || ''}`.toLowerCase()
    if (q && !text.includes(q.trim().toLowerCase())) return false
    if (from && (r.end || '') < from) return false   // ends before the range
    if (to && (r.start || '') > to) return false      // starts after the range
    return true
  })

  return (
    <div className="admin-modal" onClick={e => { if (e.target.classList.contains('admin-modal')) onClose() }}>
      <div className="admin-list-modal admin-list-modal--wide">
        <div className="admin-list-modal__head">
          <h3>{title} ({reservations.length})</h3>
          <button className="phone-modal__close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <ListFilters q={q} setQ={setQ} from={from} setFrom={setFrom} to={to} setTo={setTo} placeholder="Client, CIN, téléphone…" />
        <div className="admin-list-modal__body">
          {filtered.length === 0 ? (
            <p className="admin-muted">Aucun résultat ne correspond.</p>
          ) : history ? (
            /* Finished rentals → Excel-style table, one row per rental. */
            <div className="admin-hist-table-wrap">
              <table className="admin-hist-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Période</th>
                    <th>Téléphone</th>
                    <th>CIN</th>
                    <th>Départ km</th>
                    <th>Retour km</th>
                    <th>Parcourus</th>
                    <th>État</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id}>
                      <td><strong>{r.clientName || '—'}</strong></td>
                      <td className="admin-hist-table__dates">{formatDate(r.start)} → {formatDate(r.end)}</td>
                      <td>{r.tel || '—'}</td>
                      <td>{r.cin || '—'}</td>
                      <td>{r.departureKm != null ? formatKm(r.departureKm) + ' km' : '—'}</td>
                      <td>{r.returnKm != null ? formatKm(r.returnKm) + ' km' : '—'}</td>
                      <td className="admin-hist-table__dist">{kmDone(r) != null ? formatKm(kmDone(r)) + ' km' : '—'}</td>
                      <td>{r.damaged ? <span className="admin-damage-badge">🛠 Endommagée</span> : <span className="admin-ok-badge">✓ OK</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="admin-hist-table-wrap">
              <table className="admin-hist-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Période</th>
                    <th>Téléphone</th>
                    <th>CIN</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id}>
                      <td><strong>{r.clientName || '—'}</strong></td>
                      <td className="admin-hist-table__dates">{formatDate(r.start)} → {formatDate(r.end)}</td>
                      <td>{r.tel || '—'}</td>
                      <td>{r.cin || '—'}</td>
                      <td>{onRemove && <button onClick={() => onRemove(r.id)} className="admin-link-del">{removeLabel}</button>}</td>
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
              <table className="admin-hist-table">
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

function ServicesManager({ car }) {
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
      <button className="admin-services__toggle" onClick={toggle}>
        <Ico name="wrench" /> Services voiture{services ? ` (${count})` : ''} <span className="admin-services__chev">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="admin-services__body">
          {services === null ? (
            <p className="admin-muted">Chargement…</p>
          ) : (
            <>
              {count === 0 && !open && <p className="admin-muted">Aucun service enregistré.</p>}

              {count > 0 && (
                <div className="admin-hist-table-wrap">
                  <table className="admin-hist-table">
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

              {count > 0 && (
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

              {!open ? (
                <button className="admin-btn admin-btn--sm admin-btn--primary" onClick={() => setOpen(true)}>
                  ➕ Ajouter un service
                </button>
              ) : (
                <div className="admin-resa-form">
                  <div className="admin-resa-grid">
                    <label>Type de service *
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
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Inline edit for just the pick-up odometer (Voiture avec qui) ─────────── */
function EditDepartureKm({ r, onSaved, onCancel }) {
  const [km, setKm] = useState(r.departureKm != null ? String(r.departureKm) : '')
  const [busy, setBusy] = useState(false)

  const save = async () => {
    if (km === '') return showError('Indiquez le kilométrage de départ.')
    setBusy(true)
    try { await updateDepartureKm(r.id, km); onSaved() }
    catch (e) { showError('Erreur : ' + e.message) }
    setBusy(false)
  }

  return (
    <div className="admin-km-confirm admin-km-confirm--edit">
      <label><Ico name="gauge" /> Modifier le kilométrage de départ
        <input
          type="text" inputMode="numeric" autoFocus
          value={formatKm(km)}
          onChange={e => setKm(e.target.value.replace(/\D/g, ''))}
          placeholder="ex: 152.687"
          onKeyDown={e => { if (e.key === 'Enter') save() }}
        />
      </label>
      <div className="admin-km-confirm__actions">
        <button className="admin-btn admin-btn--sm" onClick={onCancel} disabled={busy}>Annuler</button>
        <button className="admin-btn admin-btn--sm admin-btn--primary" onClick={save} disabled={busy}>
          {busy ? '…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}

/* ── Inline edit form for an existing reservation ────────────────────────── */
function EditResaForm({ r, onSaved, onCancel }) {
  const [form, setForm] = useState({ clientName: r.clientName || '', cin: r.cin || '', tel: r.tel || '', start: r.start || '', end: r.end || '' })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const save = async () => {
    if (!form.clientName.trim()) return showError('Le nom du client est obligatoire.')
    if (!form.start || !form.end) return showError('Choisissez les dates.')
    if (form.end < form.start) return showError('La date de fin doit être après le début.')
    setBusy(true)
    try { await updateReservation(r.id, form); onSaved() }
    catch (e) { showError('Erreur : ' + e.message) }
    setBusy(false)
  }

  return (
    <div className="admin-resa-form admin-resa-edit-form">
      <div className="admin-resa-grid">
        <label>Nom complet *
          <input type="text" value={form.clientName} onChange={set('clientName')} autoFocus />
        </label>
        <label>CIN
          <input type="text" value={form.cin} onChange={set('cin')} />
        </label>
        <label>Téléphone
          <input type="tel" value={form.tel} onChange={set('tel')} />
        </label>
        <div aria-hidden />
        <label>Date de début *
          <input type="date" value={form.start} onChange={set('start')} />
        </label>
        <label>Date de fin *
          <input type="date" min={form.start} value={form.end} onChange={set('end')} />
        </label>
      </div>
      <div className="admin-resa-actions">
        <button className="admin-btn admin-btn--sm" onClick={onCancel}>Annuler</button>
        <button className="admin-btn admin-btn--sm admin-btn--primary" onClick={save} disabled={busy}>
          {busy ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}

/* ── Reservations panel for one car ───────────────────────────────────────── */
const EMPTY_RESA = { clientName: '', cin: '', tel: '', start: '', end: '' }

function ReservationManager({ car, onChange }) {
  const [open, setOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [histOpen, setHistOpen] = useState(false)
  const [confirming, setConfirming] = useState(null)    // id of the row whose km field is open
  const [editingId, setEditingId] = useState(null)      // id of the row being edited
  const [ongoingError, setOngoingError] = useState(null) // id of the row that triggered the block
  const [form, setForm] = useState(EMPTY_RESA)
  const [formError, setFormError] = useState(null) // { message, conflict } | null
  const [cinConflict, setCinConflict] = useState(null) // existing name under same CIN, or null
  const [cinChecking, setCinChecking] = useState(false)
  const [damageWarn, setDamageWarn] = useState(false)  // CIN has a past damage record
  const [busy, setBusy] = useState(false)
  // Editing the CIN or name invalidates any prior CIN check.
  const set = (k) => (e) => {
    setFormError(null)
    if (k === 'cin' || k === 'clientName') setCinConflict(null)
    setForm(f => ({ ...f, [k]: e.target.value }))
  }
  const today = new Date().toISOString().split('T')[0]

  // One CIN = one identity. Checked when the admin leaves the CIN field.
  const checkCin = async () => {
    if (!form.cin.trim()) { setCinConflict(null); return }
    setCinChecking(true)
    try { setCinConflict(await findCinConflict(form.cin, form.clientName)) }
    catch { /* network hiccup — don't block on it; re-checked on save */ }
    setCinChecking(false)
  }

  const save = async () => {
    if (!form.clientName.trim()) return setFormError({ message: 'Le nom du client est obligatoire.' })
    if (!form.start || !form.end) return setFormError({ message: 'Choisissez les dates de début et de fin.' })
    if (form.end < form.start) return setFormError({ message: 'La date de fin doit être après le début.' })
    // Security: block if this CIN is already registered under a different name.
    let cinOwner = cinConflict
    try { cinOwner = await findCinConflict(form.cin, form.clientName) } catch { /* keep prior result */ }
    if (cinOwner) {
      setCinConflict(cinOwner)
      return setFormError({ message: `Ce CIN est déjà enregistré sous le nom de « ${cinOwner} ». Un même CIN ne peut pas avoir deux noms différents.` })
    }
    // Check overlap with every active reservation (reservee or en_cours).
    const active = all.filter(r => r.status !== 'terminee')
    const conflict = active.find(r => r.start < form.end && r.end > form.start)
    if (conflict) return setFormError({ message: null, conflict })
    // Damage history: warn (but allow override) if this CIN damaged a car before.
    try {
      if (await findCinDamage(form.cin)) { setDamageWarn(true); return }
    } catch { /* network hiccup — don't block on it */ }
    doSave()
  }

  // The actual insert — called directly, or after the admin overrides the damage warning.
  const doSave = async () => {
    setBusy(true)
    try {
      // The plate comes from the car itself — no need to type it.
      await addReservation(car.id, { ...form, matriculation: car.immatriculation || null })
      setForm(EMPTY_RESA); setOpen(false); setDamageWarn(false)
      onChange()
    } catch (e) { showError('Erreur : ' + e.message) }
    setBusy(false)
  }

  const remove = async (id) => {
    if (!await confirmAsync('Supprimer définitivement cette ligne ?', { confirmLabel: 'Supprimer', danger: true })) return
    try { await deletePeriod(id); onChange() }
    catch (e) { showError('Erreur : ' + e.message) }
  }

  // reservee → en_cours: client picks up the car (record departure odometer).
  const pickup = async (id, km) => { await confirmPickup(id, km); setConfirming(null); onChange() }
  // en_cours → terminee: client returns the car (record return odometer + damage).
  const giveBack = async (id, km, damaged) => { await confirmReturn(id, km, damaged); setConfirming(null); onChange() }

  // Split every period of this car by its workflow stage.
  const todayMs = Date.now()
  // Nearest start date to today first (for reservee); newest first for history.
  const byNearest = (a, b) => {
    const distA = a.start ? Math.abs(new Date(a.start) - todayMs) : Infinity
    const distB = b.start ? Math.abs(new Date(b.start) - todayMs) : Infinity
    return distA - distB
  }
  const byStartDesc = (a, b) => (b.start || '').localeCompare(a.start || '')
  const all = car.unavailable ?? []

  // Build the set of greyed-out dates for the reservation popup calendar.
  // Rule: strictly interior dates of every active reservation are blocked.
  // Additionally, if an end date of one reservation equals the start of another, block it too.
  const blockedDates = useMemo(() => {
    const active = all.filter(r => r.status !== 'terminee')
    const startSet = new Set(active.map(r => r.start))
    const set = new Set()
    for (const r of active) {
      const cur = new Date(r.start)
      cur.setDate(cur.getDate() + 1)
      const end = new Date(r.end)
      while (cur < end) {
        set.add(cur.toISOString().split('T')[0])
        cur.setDate(cur.getDate() + 1)
      }
      if (startSet.has(r.end)) set.add(r.end)
    }
    return set
  }, [all])

  const reserved = all.filter(r => (r.status ?? 'reservee') === 'reservee').sort(byNearest)
  const ongoing  = all.filter(r => r.status === 'en_cours').sort(byNearest)
  const history  = all.filter(r => r.status === 'terminee').sort(byStartDesc)

  return (
    <div className="admin-resa">
      <div className="admin-resa__head">
        <h4>📋 Réservations</h4>
        {!open && (
          <button className="admin-btn admin-btn--sm admin-btn--primary" onClick={() => setOpen(true)}>
            ➕ Faire une réservation
          </button>
        )}
      </div>

      {reserved.length === 0 && !open && (
        <p className="admin-muted">Aucune réservation en attente.</p>
      )}

      {reserved.length > 0 && (
        <div className="admin-hist-table-wrap">
          <table className="admin-hist-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Période</th>
                <th>Téléphone</th>
                <th>CIN</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {reserved.slice(0, 3).map(r => (
                <React.Fragment key={r.id}>
                  <tr>
                    <td><strong>{r.clientName || '—'}</strong></td>
                    <td className="admin-hist-table__dates">{formatDate(r.start)} → {formatDate(r.end)}</td>
                    <td>{r.tel || '—'}</td>
                    <td>{r.cin || '—'}</td>
                    <td>
                      {confirming === r.id ? (
                        <KmConfirm
                          label="Kilométrage de départ"
                          actionLabel="Valider la réception"
                          onSubmit={(km) => pickup(r.id, km)}
                          onCancel={() => setConfirming(null)}
                        />
                      ) : (
                        <div className="admin-resa-actions-inline">
                          {ongoingError === r.id && (
                            <span className="admin-resa-block-error">⚠ Tu dois confirmer le retour d'abord</span>
                          )}
                          <button
                            className="admin-btn admin-btn--sm admin-btn--confirm"
                            onClick={() => {
                              if (ongoing.length > 0) { setOngoingError(r.id); return }
                              setOngoingError(null); setConfirming(r.id)
                            }}
                          >
                            ✓ Confirmer la réception
                          </button>
                          <button className="admin-btn admin-btn--sm admin-btn--edit" onClick={() => setEditingId(editingId === r.id ? null : r.id)}>✏ Modifier</button>
                          <button onClick={() => remove(r.id)} className="admin-link-del">Annuler</button>
                        </div>
                      )}
                    </td>
                  </tr>
                  {editingId === r.id && (
                    <tr key={r.id + '-edit'} className="admin-edit-row">
                      <td colSpan={5}>
                        <EditResaForm r={r} onSaved={() => { setEditingId(null); onChange() }} onCancel={() => setEditingId(null)} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {reserved.length > 3 && (
        <button className="admin-btn admin-btn--sm admin-all-btn" onClick={() => setModalOpen(true)}>
          📋 Voir toutes les réservations ({reserved.length})
        </button>
      )}

      {/* ── Stage 2: cars currently handed over to a client ─────────────── */}
      {ongoing.length > 0 && (
        <>
          <div className="admin-resa__subhead admin-resa__subhead--ongoing">
            <Ico name="car" /> Voiture avec qui ({ongoing.length})
          </div>
          <div className="admin-hist-table-wrap">
            <table className="admin-hist-table admin-hist-table--ongoing">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Période</th>
                  <th>Téléphone</th>
                  <th>CIN</th>
                  <th>Départ km</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ongoing.map(r => (
                  <React.Fragment key={r.id}>
                    <tr>
                      <td><strong>{r.clientName || '—'}</strong></td>
                      <td className="admin-hist-table__dates">{formatDate(r.start)} → {formatDate(r.end)}</td>
                      <td>{r.tel || '—'}</td>
                      <td>{r.cin || '—'}</td>
                      <td>{r.departureKm != null ? formatKm(r.departureKm) + ' km' : '—'}</td>
                      <td>
                        {confirming === r.id ? (
                          <KmConfirm
                            label="Nouveau kilométrage (au retour)"
                            actionLabel="Valider le retour"
                            withDamage
                            onSubmit={(km, damaged) => {
                              if (r.departureKm != null && Number(km) <= r.departureKm)
                                return Promise.reject(new Error(`Le kilométrage de retour (${formatKm(km)} km) doit être supérieur au kilométrage de départ (${formatKm(r.departureKm)} km).`))
                              return giveBack(r.id, km, damaged)
                            }}
                            onCancel={() => setConfirming(null)}
                          />
                        ) : (
                          <div className="admin-resa-actions-inline">
                              <button className="admin-btn admin-btn--sm admin-btn--confirm" onClick={() => setConfirming(r.id)}>
                              ↩ Confirmer le retour
                            </button>
                            <button className="admin-btn admin-btn--sm admin-btn--edit" onClick={() => setEditingId(editingId === r.id ? null : r.id)}>✏ Modifier</button>
                            <button onClick={() => remove(r.id)} className="admin-link-del">Annuler</button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {editingId === r.id && (
                      <tr key={r.id + '-edit'} className="admin-edit-row">
                        <td colSpan={6}>
                          <EditDepartureKm r={r} onSaved={() => { setEditingId(null); onChange() }} onCancel={() => setEditingId(null)} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Stage 3: finished rentals — just a button that opens the full list ── */}
      {history.length > 0 && (
        <button className="admin-btn admin-btn--sm admin-all-btn" onClick={() => setHistOpen(true)}>
          📜 Location historique ({history.length})
        </button>
      )}

      {modalOpen && (
        <ReservationsModal
          title="📋 Toutes les réservations"
          reservations={reserved}
          onClose={() => setModalOpen(false)}
          onRemove={remove}
        />
      )}

      {histOpen && (
        <ReservationsModal
          title="📜 Location historique"
          reservations={history}
          history
          removeLabel="Supprimer"
          onClose={() => setHistOpen(false)}
          onRemove={remove}
        />
      )}

      {open && (
        <div className="admin-modal" onClick={e => { if (e.target.classList.contains('admin-modal')) { setOpen(false); setForm(EMPTY_RESA); setFormError(null); setCinConflict(null); setDamageWarn(false) } }}>
          <div className="admin-resa-popup">
            <div className="admin-resa-popup__head">
              <h3>➕ Nouvelle réservation — {car.name}</h3>
              <button className="phone-modal__close" onClick={() => { setOpen(false); setForm(EMPTY_RESA); setFormError(null); setCinConflict(null); setDamageWarn(false) }} aria-label="Fermer">✕</button>
            </div>
            {formError?.message && (
              <div className="admin-resa-popup__error"><p>{formError.message}</p></div>
            )}
            <div className="admin-resa-grid">
              <label>Nom complet du client *
                <input type="text" value={form.clientName} onChange={set('clientName')} autoFocus />
              </label>
              <label>CIN
                <input
                  type="text" value={form.cin}
                  onChange={set('cin')} onBlur={checkCin}
                  className={cinConflict ? 'admin-input-error' : ''}
                />
                {cinChecking && <small className="admin-hint">Vérification…</small>}
                {cinConflict && <small className="admin-cin-warn">⚠ CIN déjà utilisé par « {cinConflict} »</small>}
              </label>
              <label>Téléphone
                <input type="tel" value={form.tel} onChange={set('tel')} />
              </label>
              <div aria-hidden />
              <label>Date de début *
                <DatePicker value={form.start} onChange={v => { setFormError(null); setForm(f => ({ ...f, start: v })) }} min={today} placeholder="JJ-MMM-AAAA" blockedDates={blockedDates} />
              </label>
              <label>Date de fin *
                <DatePicker value={form.end} onChange={v => { setFormError(null); setForm(f => ({ ...f, end: v })) }} min={form.start || today} placeholder="JJ-MMM-AAAA" blockedDates={blockedDates} />
              </label>
            </div>
            <div className="admin-resa-actions">
              <button className="admin-btn admin-btn--sm" onClick={() => { setOpen(false); setForm(EMPTY_RESA); setFormError(null); setCinConflict(null) }}>Annuler</button>
              <button className="admin-btn admin-btn--sm admin-btn--primary" onClick={save} disabled={busy || cinChecking || !!cinConflict}>
                {busy ? 'Enregistrement…' : 'Enregistrer la réservation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {formError?.conflict && (
        <div className="admin-modal admin-modal--conflict" onClick={() => setFormError(null)}>
          <div className="admin-conflict-popup">
            <div className="admin-conflict-popup__head">
              <span className="admin-conflict-popup__icon">⚠</span>
              <h3>Dates non disponibles</h3>
              <button className="phone-modal__close" onClick={() => setFormError(null)} aria-label="Fermer">✕</button>
            </div>
            <p className="admin-conflict-popup__desc">Ces dates chevauchent une réservation existante :</p>
            <div className="admin-resa-popup__conflict">
              <span className="conflict-chip conflict-chip--name"><Ico name="user" /> {formError.conflict.clientName || 'Client'}</span>
              <span className="conflict-chip conflict-chip--date"><Ico name="calendar" /> {formatDate(formError.conflict.start)} → {formatDate(formError.conflict.end)}</span>
              {formError.conflict.tel && <span className="conflict-chip conflict-chip--tel"><Ico name="phone" /> {formError.conflict.tel}</span>}
              {formError.conflict.cin && <span className="conflict-chip conflict-chip--cin"><Ico name="id" /> {formError.conflict.cin}</span>}
            </div>
            <button className="admin-btn admin-btn--sm admin-conflict-popup__close" onClick={() => setFormError(null)}>Fermer</button>
          </div>
        </div>
      )}

      {damageWarn && (
        <div className="admin-modal admin-modal--conflict" onClick={() => setDamageWarn(false)}>
          <div className="admin-conflict-popup admin-conflict-popup--danger" onClick={e => e.stopPropagation()}>
            <div className="admin-conflict-popup__head">
              <span className="admin-conflict-popup__icon">🛠</span>
              <h3>Client à risque</h3>
              <button className="phone-modal__close" onClick={() => setDamageWarn(false)} aria-label="Fermer">✕</button>
            </div>
            <p className="admin-conflict-popup__desc">
              Ce client (<strong>{form.clientName}</strong> — CIN {form.cin}) a <strong>déjà endommagé</strong> une voiture lors d'une location précédente.
            </p>
            <p className="admin-conflict-popup__hint">Voulez-vous quand même créer cette réservation ?</p>
            <div className="admin-conflict-popup__actions">
              <button className="admin-btn admin-btn--sm" onClick={() => setDamageWarn(false)}>Annuler la réservation</button>
              <button className="admin-btn admin-btn--sm admin-btn--primary" onClick={doSave} disabled={busy}>
                {busy ? 'Enregistrement…' : 'Confirmer quand même'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Add / edit car form ──────────────────────────────────────────────────── */
function CarForm({ initial, onSaved, onCancel }) {
  const [car, setCar] = useState(initial)
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)   // file drop highlight
  const dragIndex = useRef(null)                     // thumbnail being reordered
  const set = (k, v) => setCar(c => ({ ...c, [k]: v }))

  // Toggle a category on/off. `category` (main label) stays in sync with the
  // first selected one so the cards keep showing a sensible label.
  const toggleCat = (value) => setCar(c => {
    const current = c.categories ?? []
    const next = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value]
    return { ...c, categories: next, category: next[0] ?? '' }
  })

  // Upload one or more files → append their URLs to the gallery.
  const uploadFiles = async (files) => {
    const imgs = files.filter(f => f.type.startsWith('image/'))
    if (!imgs.length) return
    setUploading(true)
    try {
      const urls = await uploadCarPhotos(imgs)
      setCar(c => {
        const photos = [...(c.photos ?? []), ...urls]
        return { ...c, photos, photo: photos[0] }
      })
    } catch (err) { showError('Échec de l’upload : ' + err.message) }
    setUploading(false)
  }

  const handlePhotos = (e) => {
    uploadFiles(Array.from(e.target.files ?? []))
    e.target.value = '' // allow re-selecting the same file(s)
  }

  // Drop image files from the computer onto the photos area.
  const handleDrop = (e) => {
    if (!e.dataTransfer.files?.length) return
    e.preventDefault()
    setDragOver(false)
    uploadFiles(Array.from(e.dataTransfer.files))
  }

  // Reorder thumbnails by dragging one onto another (index 0 = cover).
  const reorder = (from, to) => setCar(c => {
    const photos = [...(c.photos ?? [])]
    const [moved] = photos.splice(from, 1)
    photos.splice(to, 0, moved)
    return { ...c, photos, photo: photos[0] }
  })

  const removePhoto = (i) => setCar(c => {
    const photos = (c.photos ?? []).filter((_, idx) => idx !== i)
    return { ...c, photos, photo: photos[0] || '' }
  })

  // Promote a photo to first position (= the cover shown on cards).
  const makeCover = (i) => setCar(c => {
    const photos = [...(c.photos ?? [])]
    const [pic] = photos.splice(i, 1)
    photos.unshift(pic)
    return { ...c, photos, photo: photos[0] }
  })

  const addPhotoUrl = (url) => setCar(c => {
    const photos = [...(c.photos ?? []), url]
    return { ...c, photos, photo: photos[0] }
  })

  const save = async (e) => {
    e.preventDefault()
    if (!car.name.trim()) return showError('Le nom est obligatoire.')
    if (!(car.categories ?? []).length) return showError('Choisissez au moins une catégorie.')
    setBusy(true)
    try {
      if (car.id) await updateCar(car.id, car)
      else await createCar(car)
      onSaved()
    } catch (err) { showError('Erreur : ' + err.message) }
    setBusy(false)
  }

  return (
    <form className="admin-form" onSubmit={save}>
      <div className="admin-form__head">
        <h3>{car.id ? '✏️ Modifier la voiture' : '➕ Nouvelle voiture'}</h3>
        <p className="admin-muted">Renseignez les informations et ajoutez des photos.</p>
      </div>

      <div className="admin-section">
        <span className="admin-section__label">
          Photos <small className="admin-hint">(glissez-déposez des images · 1ʳᵉ = couverture · réorganisez en glissant)</small>
        </span>
        <div
          className={`admin-photos ${dragOver ? 'drag-over' : ''}`}
          onDragOver={e => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragOver(true) } }}
          onDragLeave={e => { if (e.currentTarget === e.target) setDragOver(false) }}
          onDrop={handleDrop}
        >
          {(car.photos ?? []).map((url, i) => (
            <div
              className={`admin-thumb ${i === 0 ? 'admin-thumb--cover' : ''}`}
              key={url + i}
              draggable
              onDragStart={() => { dragIndex.current = i }}
              onDragOver={e => e.preventDefault()}
              onDrop={(e) => {
                e.stopPropagation()
                const from = dragIndex.current
                if (from !== null && from !== i) reorder(from, i)
                dragIndex.current = null
              }}
            >
              <img src={url} alt="" />
              {i === 0 && <span className="admin-thumb__badge">Couverture</span>}
              <div className="admin-thumb__actions">
                {i !== 0 && (
                  <button type="button" title="Définir comme couverture" onClick={() => makeCover(i)}>★</button>
                )}
                <button type="button" title="Supprimer" onClick={() => removePhoto(i)}>✕</button>
              </div>
            </div>
          ))}
          <label className="admin-thumb admin-thumb--add">
            <span>{uploading ? '⏳ Envoi…' : '＋ Ajouter'}</span>
            <input type="file" accept="image/*" multiple hidden onChange={handlePhotos} disabled={uploading} />
          </label>
        </div>
        <input
          type="text" className="admin-photo-url"
          placeholder="…ou collez une URL d’image puis Entrée"
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              const v = e.target.value.trim()
              if (v) { addPhotoUrl(v); e.target.value = '' }
            }
          }}
        />
      </div>

      <div className="admin-grid">
        <label>Nom du modèle *
          <input type="text" value={car.name} onChange={e => set('name', e.target.value)} required />
          <small className="admin-hint">Même nom = fusionné en une seule carte sur le site</small>
        </label>
        <label>Immatriculation
          <input type="text" value={car.immatriculation || ''} onChange={e => set('immatriculation', e.target.value)} placeholder="ex: 12345-A-6" />
        </label>
        <div className="admin-color-field">
          <span>Couleur</span>
          <div className="admin-colors">
            {carColors.map(c => (
              <button
                type="button"
                key={c.hex}
                className={`admin-color-dot ${car.color === c.hex ? 'active' : ''}`}
                style={{ background: c.hex }}
                title={c.name}
                onClick={() => set('color', car.color === c.hex ? '' : c.hex)}
              />
            ))}
            {car.color && <span className="admin-color-name">{colorName(car.color)}</span>}
          </div>
        </div>
        <div className="admin-cats-field">
          <span>Catégories <small className="admin-hint">(cochez une ou plusieurs)</small></span>
          <div className="admin-cats-pick">
            {CATEGORIES.map(c => {
              const on = (car.categories ?? []).includes(c.value)
              return (
                <button
                  type="button"
                  key={c.value}
                  className={`admin-cat-chip ${on ? 'active' : ''}`}
                  onClick={() => toggleCat(c.value)}
                >
                  {on ? '✓ ' : ''}{c.label}
                </button>
              )
            })}
          </div>
        </div>
        <label>Prix / jour (MAD) *
          <input type="number" value={car.price} onChange={e => set('price', e.target.value)} min="0" required />
        </label>
        <label>Carburant *
          <select value={car.fuel} onChange={e => set('fuel', e.target.value)} required>
            <option>Essence</option>
            <option>Diesel</option>
            <option>Hybride</option>
            <option>Electrique</option>
          </select>
        </label>
        <label>Boîte *
          <select value={car.transmission} onChange={e => set('transmission', e.target.value)} required>
            <option>Manuel</option><option>Auto</option>
          </select>
        </label>
        <label>Places *
          <input type="number" value={car.seats} onChange={e => set('seats', e.target.value)} min="1" max="20" required />
        </label>
        <label>Extra (ex: Clim auto) *
          <input type="text" value={car.extra} onChange={e => set('extra', e.target.value)} required />
        </label>
        <label>Badge (ex: Nouveau)
          <input type="text" value={car.badge || ''} onChange={e => set('badge', e.target.value)} />
          <small className="admin-hint">Couleur auto : Nouveau=bleu · Prestige=or · autres=rouge</small>
        </label>
        <label>Ordre d’affichage
          {/* Shown 1-based to the user (1, 2, 3…) but stored 0-based. */}
          <input
            type="number" min="1"
            value={(Number(car.sortOrder) || 0) + 1}
            onChange={e => set('sortOrder', Math.max(0, (Number(e.target.value) || 1) - 1))}
          />
        </label>
      </div>

      <label className={`admin-damaged-toggle ${car.damaged ? 'is-on' : ''}`}>
        <input type="checkbox" checked={!!car.damaged} onChange={e => set('damaged', e.target.checked)} />
        <span><Ico name="wrench" /> Voiture endommagée — la rendre indisponible</span>
      </label>

      <div className="admin-form-actions">
        <button type="button" className="admin-btn" onClick={onCancel}>Annuler</button>
        <button className="admin-btn admin-btn--primary" disabled={busy || uploading}>
          {busy ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </form>
  )
}

/* ── Main dashboard ───────────────────────────────────────────────────────── */
function Dashboard({ onLogout }) {
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // car object or 'new' or null
  const [query, setQuery] = useState('')        // search by name / immatriculation

  const q = query.trim().toLowerCase()
  const visible = cars
    .filter(c => !q || c.name?.toLowerCase().includes(q) || c.immatriculation?.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name)) // cluster units of the same model
  const modelCount = new Set(cars.map(c => c.name.trim().toLowerCase())).size

  const load = useCallback(async () => {
    setLoading(true)
    setCars(await fetchCars())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const remove = async (car) => {
    if (!await confirmAsync(`Supprimer « ${car.name} » ? Cette action est définitive.`, { confirmLabel: 'Supprimer', danger: true })) return
    try { await deleteCar(car.id); load() }
    catch (e) { showError('Erreur : ' + e.message) }
  }

  const onSaved = () => { setEditing(null); load() }

  return (
    <div className="admin-shell">
      <DialogHost />
      <header className="admin-header">
        <div className="admin-header__brand">
          <Logo size={42} animated={false} />
          <div>
            <h1>Gestion de la flotte</h1>
            <p className="admin-muted">{modelCount} modèle{modelCount > 1 ? 's' : ''} · {cars.length} unité{cars.length > 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="admin-header__actions">
          <Link to="/" className="admin-btn admin-btn--ghost"><Ico name="globe" /> Voir le site</Link>
          <button className="admin-btn admin-btn--logout" onClick={onLogout}><Ico name="logout" /> Déconnexion</button>
          <button className="admin-btn admin-btn--add" onClick={() => setEditing('new')}><Ico name="carplus" /> Ajouter une voiture</button>
        </div>
      </header>

      {editing && (
        <div className="admin-modal" onClick={e => { if (e.target.classList.contains('admin-modal')) setEditing(null) }}>
          <div className="admin-modal__inner">
            <CarForm
              initial={editing === 'new' ? { ...EMPTY_CAR } : editing}
              onSaved={onSaved}
              onCancel={() => setEditing(null)}
            />
          </div>
        </div>
      )}

      {!loading && cars.length > 0 && (
        <div className="admin-toolbar">
          <input
            type="search" className="admin-search"
            placeholder="Rechercher par modèle ou immatriculation…"
            value={query} onChange={e => setQuery(e.target.value)}
          />
          {q && <span className="admin-muted">{visible.length} résultat{visible.length > 1 ? 's' : ''}</span>}
        </div>
      )}

      {loading ? (
        <p className="admin-muted admin-pad">Chargement…</p>
      ) : cars.length === 0 ? (
        <p className="admin-muted admin-pad">Aucune voiture. Cliquez sur « Ajouter ».</p>
      ) : visible.length === 0 ? (
        <p className="admin-muted admin-pad">Aucun véhicule ne correspond à « {query} ».</p>
      ) : (
        <div className="admin-cars">
          {visible.map(car => (
            <div key={car.id} className="admin-car">
              <div className="admin-car__photo">
                {car.photo ? <img src={car.photo} alt={car.name} /> : <span>—</span>}
              </div>
              <div className="admin-car__main">
                <div className="admin-car__top">
                  <div>
                    <h3>{car.name}</h3>
                    <div className="admin-car__meta">
                      <span className="admin-tag">{car.category}</span>
                      {car.color && <span className="admin-dot" style={{ background: car.color }} title={colorName(car.color)} />}
                      {car.immatriculation && <span className="admin-plate">{car.immatriculation}</span>}
                      <span className="admin-price">{car.price} {car.currency}/j</span>
                    </div>
                  </div>
                  <div className="admin-car__btns">
                    <button className="admin-btn admin-btn--sm admin-btn--edit" onClick={() => setEditing(car)}>✏ Modifier</button>
                    <button className="admin-btn admin-btn--sm admin-btn--delcar" onClick={() => remove(car)}>🗑 Supprimer</button>
                  </div>
                </div>
                <ServicesManager car={car} />
                <ReservationManager car={car} onChange={load} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Page entry: gates on Supabase config + auth session ──────────────────── */
export default function Admin() {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured) { setReady(true); return }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session); setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (!isSupabaseConfigured) {
    return (
      <div className="admin-login">
        <div className="admin-login__card">
          <h1>⚙️ Configuration requise</h1>
          <p className="admin-login__sub">
            Supabase n’est pas encore configuré. Renseignez <code>VITE_SUPABASE_URL</code> et
            <code> VITE_SUPABASE_ANON_KEY</code> dans le fichier <code>.env</code>, puis relancez
            <code> npm run dev</code>. Voir <code>SETUP-SUPABASE.md</code>.
          </p>
          <Link to="/" className="admin-login__back">← Retour au site</Link>
        </div>
      </div>
    )
  }

  if (!ready) return <div className="admin-login"><p className="admin-muted">Chargement…</p></div>

  if (!session) return <Login onAuthed={() => { /* session set via listener */ }} />

  return <Dashboard onLogout={() => supabase.auth.signOut()} />
}
