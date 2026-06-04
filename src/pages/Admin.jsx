import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import { carColors, colorName } from '../data'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import {
  fetchCars, createCar, updateCar, deleteCar,
  uploadCarPhotos, addReservation, deletePeriod,
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
  color: '', immatriculation: '',
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
      <label>Du <input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
      <label>Au <input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
      {(q || from || to) && (
        <button className="admin-btn admin-btn--sm" onClick={() => { setQ(''); setFrom(''); setTo('') }}>Réinitialiser</button>
      )}
    </div>
  )
}

/* ── Pop-up: all reservations with search + date range ────────────────────── */
function ReservationsModal({ reservations, onClose, onRemove }) {
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
      <div className="admin-list-modal">
        <div className="admin-list-modal__head">
          <h3>📋 Toutes les réservations ({reservations.length})</h3>
          <button className="phone-modal__close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <ListFilters q={q} setQ={setQ} from={from} setFrom={setFrom} to={to} setTo={setTo} placeholder="🔎 Client, CIN, téléphone…" />
        <div className="admin-list-modal__body">
          {filtered.length === 0 ? (
            <p className="admin-muted">Aucune réservation ne correspond.</p>
          ) : (
            <ul className="admin-resa-list">
              {filtered.map(r => (
                <li key={r.id}>
                  <div className="admin-resa-item">
                    <strong><Ico name="user" /> {r.clientName || 'Client'}</strong>
                    <span className="svc-chip svc-chip--date"><Ico name="calendar" /> {r.start} → {r.end}</span>
                    {r.tel && <span className="svc-chip svc-chip--tel"><Ico name="phone" /> {r.tel}</span>}
                    {r.cin && <span className="svc-chip svc-chip--cin"><Ico name="id" /> {r.cin}</span>}
                  </div>
                  <button onClick={() => onRemove(r.id)} className="admin-link-del">Annuler</button>
                </li>
              ))}
            </ul>
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
      <div className="admin-list-modal">
        <div className="admin-list-modal__head">
          <h3>🔧 Tous les services ({services.length})</h3>
          <button className="phone-modal__close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <ListFilters q={q} setQ={setQ} from={from} setFrom={setFrom} to={to} setTo={setTo} placeholder="🔎 Type de service, note…" />
        <div className="admin-list-modal__body">
          {filtered.length === 0 ? (
            <p className="admin-muted">Aucun service ne correspond.</p>
          ) : (
            <ul className="admin-svc-list">
              {filtered.map(s => (
                <li key={s.id}>
                  <div className="admin-svc-item">
                    <strong><Ico name="wrench" /> {s.service}</strong>
                    {s.date && <span className="svc-chip svc-chip--date"><Ico name="calendar" /> {s.date}</span>}
                    {s.mileage != null && <span className="svc-chip svc-chip--km"><Ico name="gauge" /> {formatKm(s.mileage)} km</span>}
                    {s.cost != null && <span className="svc-chip svc-chip--cost"><Ico name="money" /> {s.cost.toLocaleString('fr-FR')} MAD</span>}
                    {s.note && <span className="svc-chip svc-chip--note"><Ico name="note" /> {s.note}</span>}
                  </div>
                  <button onClick={() => onRemove(s.id)} className="admin-link-del">Supprimer</button>
                </li>
              ))}
            </ul>
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
    catch (e) { alert('Erreur : ' + e.message) }
  }
  const toggle = () => {
    const next = !expanded
    setExpanded(next)
    if (next && services === null) load()
  }
  const save = async () => {
    if (!form.service.trim()) return alert('Indiquez le type de service.')
    setBusy(true)
    try {
      await addCarService(car.id, form)
      setForm(EMPTY_SERVICE); setOpen(false); load()
    } catch (e) { alert('Erreur : ' + e.message) }
    setBusy(false)
  }
  const remove = async (id) => {
    if (!confirm('Supprimer ce service ?')) return
    try { await deleteCarService(id); load() }
    catch (e) { alert('Erreur : ' + e.message) }
  }

  const count = services?.length ?? 0
  // Services come already sorted newest-first from the DB.
  const shownServices = (services ?? []).slice(0, 3)

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
                <ul className="admin-svc-list">
                  {shownServices.map(s => (
                    <li key={s.id}>
                      <div className="admin-svc-item">
                        <strong><Ico name="wrench" /> {s.service}</strong>
                        {s.date && <span className="svc-chip svc-chip--date"><Ico name="calendar" /> {s.date}</span>}
                        {s.mileage != null && <span className="svc-chip svc-chip--km"><Ico name="gauge" /> {formatKm(s.mileage)} km</span>}
                        {s.cost != null && <span className="svc-chip svc-chip--cost"><Ico name="money" /> {s.cost.toLocaleString('fr-FR')} MAD</span>}
                        {s.note && <span className="svc-chip svc-chip--note"><Ico name="note" /> {s.note}</span>}
                      </div>
                      <button onClick={() => remove(s.id)} className="admin-link-del">Supprimer</button>
                    </li>
                  ))}
                </ul>
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

/* ── Reservations panel for one car ───────────────────────────────────────── */
const EMPTY_RESA = { clientName: '', cin: '', tel: '', start: '', end: '' }

function ReservationManager({ car, onChange }) {
  const [open, setOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_RESA)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const today = new Date().toISOString().split('T')[0]

  const save = async () => {
    if (!form.clientName.trim()) return alert('Le nom du client est obligatoire.')
    if (!form.start || !form.end) return alert('Choisissez les dates de début et de fin.')
    if (form.end < form.start) return alert('La date de fin doit être après le début.')
    setBusy(true)
    try {
      // The plate comes from the car itself — no need to type it.
      await addReservation(car.id, { ...form, matriculation: car.immatriculation || null })
      setForm(EMPTY_RESA); setOpen(false)
      onChange()
    } catch (e) { alert('Erreur : ' + e.message) }
    setBusy(false)
  }

  const remove = async (id) => {
    if (!confirm('Annuler cette réservation ?')) return
    try { await deletePeriod(id); onChange() }
    catch (e) { alert('Erreur : ' + e.message) }
  }

  // Newest reservations first (by start date).
  const resas = [...(car.unavailable ?? [])].sort((a, b) => (b.start || '').localeCompare(a.start || ''))
  const shownResas = resas.slice(0, 3)

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

      {resas.length === 0 && !open && (
        <p className="admin-muted">Aucune réservation — voiture toujours disponible.</p>
      )}

      {resas.length > 0 && (
        <ul className="admin-resa-list">
          {shownResas.map(r => (
            <li key={r.id}>
              <div className="admin-resa-item">
                <strong><Ico name="user" /> {r.clientName || 'Client'}</strong>
                <span className="svc-chip svc-chip--date"><Ico name="calendar" /> {r.start} → {r.end}</span>
                {r.tel && <span className="svc-chip svc-chip--tel"><Ico name="phone" /> {r.tel}</span>}
                {r.cin && <span className="svc-chip svc-chip--cin"><Ico name="id" /> {r.cin}</span>}
              </div>
              <button onClick={() => remove(r.id)} className="admin-link-del">Annuler</button>
            </li>
          ))}
        </ul>
      )}

      {resas.length > 0 && (
        <button className="admin-btn admin-btn--sm admin-all-btn" onClick={() => setModalOpen(true)}>
          📋 Voir toutes les réservations ({resas.length})
        </button>
      )}

      {modalOpen && (
        <ReservationsModal
          reservations={resas}
          onClose={() => setModalOpen(false)}
          onRemove={remove}
        />
      )}

      {open && (
        <div className="admin-resa-form">
          <div className="admin-resa-grid">
            <label>Nom complet du client *
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
              <input type="date" min={today} value={form.start} onChange={set('start')} />
            </label>
            <label>Date de fin *
              <input type="date" min={form.start || today} value={form.end} onChange={set('end')} />
            </label>
          </div>
          <div className="admin-resa-actions">
            <button className="admin-btn admin-btn--sm" onClick={() => { setOpen(false); setForm(EMPTY_RESA) }}>Annuler</button>
            <button className="admin-btn admin-btn--sm admin-btn--primary" onClick={save} disabled={busy}>
              {busy ? 'Enregistrement…' : 'Enregistrer la réservation'}
            </button>
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
    } catch (err) { alert('Échec de l’upload : ' + err.message) }
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
    if (!car.name.trim()) return alert('Le nom est obligatoire.')
    if (!(car.categories ?? []).length) return alert('Choisissez au moins une catégorie.')
    setBusy(true)
    try {
      if (car.id) await updateCar(car.id, car)
      else await createCar(car)
      onSaved()
    } catch (err) { alert('Erreur : ' + err.message) }
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
    if (!confirm(`Supprimer "${car.name}" ? Cette action est définitive.`)) return
    try { await deleteCar(car.id); load() }
    catch (e) { alert('Erreur : ' + e.message) }
  }

  const onSaved = () => { setEditing(null); load() }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div className="admin-header__brand">
          <Logo size={42} animated={false} />
          <div>
            <h1>Gestion de la flotte</h1>
            <p className="admin-muted">{modelCount} modèle{modelCount > 1 ? 's' : ''} · {cars.length} unité{cars.length > 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="admin-header__actions">
          <Link to="/" className="admin-btn">Voir le site</Link>
          <button className="admin-btn" onClick={onLogout}>Déconnexion</button>
          <button className="admin-btn admin-btn--primary" onClick={() => setEditing('new')}>➕ Ajouter</button>
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
            placeholder="🔎 Rechercher par modèle ou immatriculation…"
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
                    <button className="admin-btn admin-btn--sm" onClick={() => setEditing(car)}>Modifier</button>
                    <button className="admin-btn admin-btn--sm admin-btn--danger" onClick={() => remove(car)}>Supprimer</button>
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
