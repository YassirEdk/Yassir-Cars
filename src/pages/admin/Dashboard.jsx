import { useState, useEffect, useCallback } from 'react'
import { DialogHost } from '../../components/AdminDialog'
import { fetchCarsAdmin } from '../../lib/cars'
import { Ico } from './Icons'
import CarForm, { EMPTY_CAR } from './CarForm'
import SettingsModal from './SettingsModal'
import Sidebar from './Sidebar'
import Overview from './Overview'
import CarsList from './CarsList'
import CarDetail from './CarDetail'
import Reservations from './Reservations'

/* ── Admin shell: sidebar + topbar, owns the fleet data and view routing ────
   views: overview · cars · reservations · car (per-car detail). */
export default function Dashboard({ onLogout }) {
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [editing, setEditing] = useState(null)        // car object | 'new' | null
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [view, setView] = useState({ type: 'overview' })
  const [navOpen, setNavOpen] = useState(false)        // mobile drawer

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

  const currentCar = view.type === 'car' ? cars.find(c => c.id === view.id) : null
  useEffect(() => {
    if (view.type === 'car' && !loading && !currentCar) setView({ type: 'cars' })
  }, [view, loading, currentCar])

  const onSaved = () => { setEditing(null); load() }
  const go = (type) => setView({ type })

  const modelCount = new Set(cars.map(c => c.name.trim().toLowerCase())).size
  const fleetSub = `${modelCount} modèle${modelCount > 1 ? 's' : ''} · ${cars.length} unité${cars.length > 1 ? 's' : ''}`
  const TITLES = {
    overview:     { h1: 'Tableau de bord', sub: 'Vue d’ensemble de la flotte' },
    cars:         { h1: 'Voitures',        sub: fleetSub },
    reservations: { h1: 'Réservations',    sub: 'Toutes les locations, par étape' },
    car:          { h1: currentCar?.name || 'Véhicule', sub: 'Tableau de bord du véhicule' },
  }
  const title = TITLES[view.type]
  const showAdd = view.type === 'overview' || view.type === 'cars'

  return (
    <div className="admin-shell">
      <DialogHost />
      <Sidebar
        view={view.type}
        onNavigate={go}
        onOpenSettings={() => setSettingsOpen(true)}
        onLogout={onLogout}
        open={navOpen}
        onClose={() => setNavOpen(false)}
      />

      <div className="admin-main">
        <header className="admin-topbar">
          <button className="admin-burger" onClick={() => setNavOpen(true)} aria-label="Menu">
            <Ico name="menu" />
          </button>
          {view.type === 'car' && (
            <button className="admin-topbar__back" onClick={() => setView({ type: 'cars' })} aria-label="Retour">←</button>
          )}
          <div className="admin-topbar__title">
            <h1>{title.h1}</h1>
            <p>{title.sub}</p>
          </div>
          <div className="admin-topbar__actions">
            {showAdd && (
              <button className="admin-btn admin-btn--add" onClick={() => setEditing('new')}>
                <Ico name="carplus" /> Ajouter une voiture
              </button>
            )}
          </div>
        </header>

        <main className="admin-content">
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
          ) : view.type === 'reservations' ? (
            <Reservations cars={cars} onOpenCar={(id) => setView({ type: 'car', id })} />
          ) : view.type === 'car' && currentCar ? (
            <CarDetail car={currentCar} onChange={load} onKmUpdate={updateCarKm} onEdit={setEditing} />
          ) : (
            <CarsList
              cars={cars} setCars={setCars} load={load}
              loading={loading} loadError={loadError}
              onEdit={setEditing}
              onOpenCar={(id) => setView({ type: 'car', id })}
            />
          )}
        </main>
      </div>
    </div>
  )
}
