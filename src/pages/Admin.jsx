import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import {
  fetchCars, createCar, updateCar, deleteCar,
  uploadCarPhoto, addUnavailablePeriod, deletePeriod,
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
  name: '', category: 'economique', categories: ['economique'], photo: '',
  brandLogo: '', brandColor: '#1a1a1a', whiteFilter: false,
  price: 250, currency: 'MAD', fuel: 'Diesel', transmission: 'Manuel',
  seats: 5, extra: 'Clim', badge: '', sortOrder: 0,
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

/* ── Date-range blocking panel for one car ────────────────────────────────── */
function PeriodsManager({ car, onChange }) {
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const add = async () => {
    if (!start || !end) return alert('Choisissez une date de début et de fin.')
    if (end < start) return alert('La date de fin doit être après le début.')
    setBusy(true)
    try {
      await addUnavailablePeriod(car.id, start, end, note || null)
      setStart(''); setEnd(''); setNote('')
      onChange()
    } catch (e) { alert('Erreur : ' + e.message) }
    setBusy(false)
  }

  const remove = async (id) => {
    if (!confirm('Supprimer cette période ?')) return
    try { await deletePeriod(id); onChange() }
    catch (e) { alert('Erreur : ' + e.message) }
  }

  return (
    <div className="admin-periods">
      <h4>🚫 Périodes indisponibles</h4>
      {(car.unavailable ?? []).length === 0 && (
        <p className="admin-muted">Toujours disponible — aucune période bloquée.</p>
      )}
      <ul className="admin-period-list">
        {(car.unavailable ?? []).map(p => (
          <li key={p.id}>
            <span>📅 {p.start} → {p.end}{p.note ? ` · ${p.note}` : ''}</span>
            <button onClick={() => remove(p.id)} className="admin-link-del">Supprimer</button>
          </li>
        ))}
      </ul>
      <div className="admin-period-add">
        <input type="date" value={start} onChange={e => setStart(e.target.value)} />
        <span>→</span>
        <input type="date" value={end} onChange={e => setEnd(e.target.value)} />
        <input type="text" placeholder="Note (ex: client X)" value={note} onChange={e => setNote(e.target.value)} />
        <button className="admin-btn admin-btn--sm" onClick={add} disabled={busy}>+ Bloquer</button>
      </div>
    </div>
  )
}

/* ── Add / edit car form ──────────────────────────────────────────────────── */
function CarForm({ initial, onSaved, onCancel }) {
  const [car, setCar] = useState(initial)
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)
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

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try { set('photo', await uploadCarPhoto(file)) }
    catch (err) { alert('Échec de l’upload : ' + err.message) }
    setUploading(false)
  }

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
      <h3>{car.id ? '✏️ Modifier' : '➕ Nouvelle voiture'}</h3>

      <div className="admin-photo-row">
        <div className="admin-photo-preview">
          {car.photo
            ? <img src={car.photo} alt="" />
            : <span>Pas de photo</span>}
        </div>
        <div>
          <label className="admin-upload-btn">
            {uploading ? 'Envoi…' : '📷 Choisir une photo'}
            <input type="file" accept="image/*" onChange={handlePhoto} hidden disabled={uploading} />
          </label>
          <input
            type="text" placeholder="…ou collez une URL d’image" value={car.photo || ''}
            onChange={e => set('photo', e.target.value)} className="admin-photo-url"
          />
        </div>
      </div>

      <div className="admin-grid">
        <label>Nom *
          <input type="text" value={car.name} onChange={e => set('name', e.target.value)} required />
        </label>
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
        <div>
          <h1>🚗 Gestion de la flotte</h1>
          <p className="admin-muted">{cars.length} véhicule{cars.length > 1 ? 's' : ''}</p>
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

      {loading ? (
        <p className="admin-muted admin-pad">Chargement…</p>
      ) : cars.length === 0 ? (
        <p className="admin-muted admin-pad">Aucune voiture. Cliquez sur « Ajouter ».</p>
      ) : (
        <div className="admin-cars">
          {cars.map(car => (
            <div key={car.id} className="admin-car">
              <div className="admin-car__photo">
                {car.photo ? <img src={car.photo} alt={car.name} /> : <span>—</span>}
              </div>
              <div className="admin-car__main">
                <div className="admin-car__top">
                  <div>
                    <h3>{car.name}</h3>
                    <span className="admin-tag">{car.category}</span>
                    <span className="admin-price">{car.price} {car.currency}/j</span>
                  </div>
                  <div className="admin-car__btns">
                    <button className="admin-btn admin-btn--sm" onClick={() => setEditing(car)}>Modifier</button>
                    <button className="admin-btn admin-btn--sm admin-btn--danger" onClick={() => remove(car)}>Supprimer</button>
                  </div>
                </div>
                <PeriodsManager car={car} onChange={load} />
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
