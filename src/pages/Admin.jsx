import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import { carColors, colorName } from '../data'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import {
  fetchCars, createCar, updateCar, deleteCar,
  uploadCarPhotos, addReservation, deletePeriod,
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

/* ── Reservations panel for one car ───────────────────────────────────────── */
const EMPTY_RESA = { clientName: '', cin: '', tel: '', matriculation: '', start: '', end: '' }

function ReservationManager({ car, onChange }) {
  const [open, setOpen] = useState(false)
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
      await addReservation(car.id, form)
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

  const resas = car.unavailable ?? []

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
          {resas.map(r => (
            <li key={r.id}>
              <div className="admin-resa-item">
                <strong>{r.clientName || 'Client'}</strong>
                <span>📅 {r.start} → {r.end}</span>
                {r.matriculation && <span>🚗 {r.matriculation}</span>}
                {r.tel && <span>📞 {r.tel}</span>}
                {r.cin && <span>🪪 {r.cin}</span>}
              </div>
              <button onClick={() => remove(r.id)} className="admin-link-del">Annuler</button>
            </li>
          ))}
        </ul>
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
            <label>Matricule de la voiture
              <input type="text" value={form.matriculation} onChange={set('matriculation')} />
            </label>
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
