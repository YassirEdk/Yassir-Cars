import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../../components/Logo'
import { DialogHost } from '../../components/AdminDialog'
import { fetchCarsAdmin } from '../../lib/cars'
import { Ico } from './Icons'
import CarForm, { EMPTY_CAR } from './CarForm'
import SettingsModal from './SettingsModal'
import Overview from './Overview'
import CarsList from './CarsList'
import CarDetail from './CarDetail'

/* ── Admin shell: owns the fleet data and switches between the three views ──
   overview (analytics dashboard) → cars (management list) → car (per-car page). */
export default function Dashboard({ onLogout }) {
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [editing, setEditing] = useState(null)       // car object | 'new' | null
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [view, setView] = useState({ type: 'overview' }) // 'overview' | 'cars' | 'car'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setCars(await fetchCarsAdmin())
      setLoadError(null)
    } catch (e) {
      setLoadError(e.message || 'Impossible de charger la flotte.')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const updateCarKm = useCallback((carId, km) => {
    setCars(prev => prev.map(c => c.id === carId ? { ...c, lastKm: km } : c))
  }, [])

  // The car currently open in the detail view (kept in sync with `cars`).
  const currentCar = view.type === 'car' ? cars.find(c => c.id === view.id) : null
  // If that car disappears (deleted) once loading settles, fall back to the list.
  useEffect(() => {
    if (view.type === 'car' && !loading && !currentCar) setView({ type: 'cars' })
  }, [view, loading, currentCar])

  const onSaved = () => { setEditing(null); load() }

  const modelCount = new Set(cars.map(c => c.name.trim().toLowerCase())).size
  const TITLES = {
    overview: { h1: 'Tableau de bord', sub: `${modelCount} modèle${modelCount > 1 ? 's' : ''} · ${cars.length} unité${cars.length > 1 ? 's' : ''}` },
    cars:     { h1: 'Gestion de la flotte', sub: `${modelCount} modèle${modelCount > 1 ? 's' : ''} · ${cars.length} unité${cars.length > 1 ? 's' : ''}` },
    car:      { h1: currentCar?.name || 'Véhicule', sub: 'Tableau de bord du véhicule' },
  }
  const title = TITLES[view.type]

  return (
    <div className="admin-shell">
      <DialogHost />
      <header className="admin-header">
        <div className="admin-header__brand">
          <Logo size={42} animated={false} />
          <div>
            <h1>{title.h1}</h1>
            <p className="admin-muted">{title.sub}</p>
          </div>
        </div>
        <div className="admin-header__actions">
          {view.type === 'overview' ? (
            <button className="admin-btn admin-btn--primary" onClick={() => setView({ type: 'cars' })}>
              <Ico name="car" /> Liste des voitures
            </button>
          ) : (
            <button className="admin-btn admin-btn--ghost" onClick={() => setView(view.type === 'car' ? { type: 'cars' } : { type: 'overview' })}>
              ← {view.type === 'car' ? 'Liste des voitures' : 'Tableau de bord'}
            </button>
          )}
          <Link to="/" className="admin-btn admin-btn--ghost"><Ico name="globe" /> Voir le site</Link>
          <button className="admin-btn admin-btn--ghost" onClick={() => setSettingsOpen(true)}>⚙ Réglages</button>
          <button className="admin-btn admin-btn--logout" onClick={onLogout}><Ico name="logout" /> Déconnexion</button>
          <button className="admin-btn admin-btn--add" onClick={() => setEditing('new')}><Ico name="carplus" /> Ajouter une voiture</button>
        </div>
      </header>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}

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

      {loading && cars.length === 0 ? (
        <p className="admin-muted admin-pad">Chargement…</p>
      ) : view.type === 'overview' ? (
        <Overview cars={cars} onOpenCar={(id) => setView({ type: 'car', id })} />
      ) : view.type === 'car' && currentCar ? (
        <CarDetail
          car={currentCar}
          onChange={load}
          onKmUpdate={updateCarKm}
          onEdit={setEditing}
        />
      ) : (
        <CarsList
          cars={cars} setCars={setCars} load={load}
          loading={loading} loadError={loadError}
          onEdit={setEditing}
          onOpenCar={(id) => setView({ type: 'car', id })}
        />
      )}
    </div>
  )
}
