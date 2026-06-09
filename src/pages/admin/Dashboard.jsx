import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../../components/Logo'
import { DialogHost, showError, confirmAsync } from '../../components/AdminDialog'
import { colorName } from '../../data'
import { fetchCarsAdmin, deleteCar, setCarDamaged, setCarOrder } from '../../lib/cars'
import { Ico } from './Icons'
import { formatKm } from './format'
import ServicesManager from './ServicesManager'
import ReservationManager from './ReservationManager'
import CarForm, { EMPTY_CAR } from './CarForm'
import SettingsModal from './SettingsModal'

/* ── Main dashboard ───────────────────────────────────────────────────────── */
export default function Dashboard({ onLogout }) {
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null) // message when fetch fails
  const [editing, setEditing] = useState(null) // car object or 'new' or null
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [query, setQuery] = useState('')        // search by name / immatriculation

  const q = query.trim().toLowerCase()
  const visible = cars
    .filter(c => !q || c.name?.toLowerCase().includes(q) || c.immatriculation?.toLowerCase().includes(q))
    // Order by the display number (Ordre d'affichage); same number → by name.
    .sort((a, b) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name))
  const modelCount = new Set(cars.map(c => c.name.trim().toLowerCase())).size

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

  const [expandedCars, setExpandedCars] = useState(new Set())
  const toggleCar = (id) => setExpandedCars(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const remove = async (car) => {
    if (!await confirmAsync(`Supprimer « ${car.name} » ? Cette action est définitive.`, { confirmLabel: 'Supprimer', danger: true })) return
    try { await deleteCar(car.id); load() }
    catch (e) { showError('Erreur : ' + e.message) }
  }

  const onSaved = () => { setEditing(null); load() }

  // ── Drag-to-reorder (handle on the left of each card) ──────────────────────
  // Only enabled when the list isn't filtered by a search, since the visible
  // order must mirror the real stored order for the drop index to be correct.
  const dragId = useRef(null)              // id of the card being dragged
  const [dragOverId, setDragOverId] = useState(null)
  const canReorder = !q

  const onDrop = async (targetId) => {
    const fromId = dragId.current
    dragId.current = null
    setDragOverId(null)
    if (!fromId || fromId === targetId) return
    // Reorder the local list immediately (optimistic), then persist.
    const ordered = [...visible]
    const from = ordered.findIndex(c => c.id === fromId)
    const to = ordered.findIndex(c => c.id === targetId)
    if (from < 0 || to < 0) return
    const [moved] = ordered.splice(from, 1)
    ordered.splice(to, 0, moved)
    setCars(ordered.map((c, i) => ({ ...c, sortOrder: i })))
    try { await setCarOrder(fromId, to) }
    catch (e) { showError('Erreur de réordonnancement : ' + e.message); load() }
  }

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

      {loadError && (
        <div className="admin-load-error admin-pad">
          <span>⚠ {loadError}</span>
          <button className="admin-btn admin-btn--sm" onClick={load}>Réessayer</button>
        </div>
      )}

      {loading ? (
        <p className="admin-muted admin-pad">Chargement…</p>
      ) : loadError ? null : cars.length === 0 ? (
        <p className="admin-muted admin-pad">Aucune voiture. Cliquez sur « Ajouter ».</p>
      ) : visible.length === 0 ? (
        <p className="admin-muted admin-pad">Aucun véhicule ne correspond à « {query} ».</p>
      ) : (
        <div className="admin-cars">
          {visible.map(car => {
            const isExpanded = expandedCars.has(car.id)
            return (
              <div
                key={car.id}
                className={`admin-car${car.damaged ? ' admin-car--damaged' : ''}${dragOverId === car.id ? ' admin-car--dragover' : ''}`}
                onDragOver={canReorder ? (e => { e.preventDefault(); if (dragOverId !== car.id) setDragOverId(car.id) }) : undefined}
                onDrop={canReorder ? (e => { e.preventDefault(); onDrop(car.id) }) : undefined}
              >
                {canReorder && (
                  <div
                    className="admin-car__drag"
                    title="Glisser pour changer l'ordre"
                    draggable
                    onDragStart={() => { dragId.current = car.id }}
                    onDragEnd={() => { dragId.current = null; setDragOverId(null) }}
                  >
                    <Ico name="drag" />
                  </div>
                )}
                <div className="admin-car__photo" onClick={() => toggleCar(car.id)} style={{ cursor: 'pointer' }}>
                  {car.photo ? <img src={car.photo} alt={car.name} /> : <span>—</span>}
                </div>
                <div className="admin-car__main">
                  <div className="admin-car__top">
                    <div className="admin-car__title-row" onClick={() => toggleCar(car.id)} style={{ cursor: 'pointer', flex: 1 }}>
                      <h3>{car.name} <span className="admin-car__chev">{isExpanded ? '▲' : '▼'}</span></h3>
                      <div className="admin-car__meta">
                        <span className="admin-tag admin-tag--order" title="Ordre d'affichage">#{(Number(car.sortOrder) || 0) + 1}</span>
                        <span className="admin-tag">{car.category}</span>
                        {car.color && <span className="admin-dot" style={{ background: car.color }} title={colorName(car.color)} />}
                        {car.lastKm != null && <span className="admin-last-km" title="Dernier km déclaré"><Ico name="gauge" /> {formatKm(car.lastKm)} km</span>}
                        {car.immatriculation && <span className="admin-plate">{car.immatriculation}</span>}
                        <span className="admin-price">{car.price} {car.currency}/j</span>
                      </div>
                    </div>
                    <div className="admin-car__btns">
                      <label className={`admin-car__damaged-toggle${car.damaged ? ' is-on' : ''}`} title={car.damaged ? 'Marquer comme disponible' : 'Marquer comme endommagée'}>
                        <input
                          type="checkbox"
                          checked={!!car.damaged}
                          onChange={async e => {
                            const next = e.target.checked
                            const ok = await confirmAsync(
                              next
                                ? `Marquer « ${car.name} » comme endommagée ? Elle ne sera plus disponible à la réservation.`
                                : `Marquer « ${car.name} » comme disponible ? Elle redeviendra réservable.`,
                              { confirmLabel: next ? 'Endommagée' : 'Disponible', danger: next }
                            )
                            if (!ok) return
                            await setCarDamaged(car.id, next)
                            load()
                          }}
                        />
                        🛠 Endommagée
                      </label>
                      <button className="admin-btn admin-btn--sm admin-btn--edit" onClick={() => setEditing(car)}>✏ Modifier</button>
                      <button className="admin-btn admin-btn--sm admin-btn--delcar" onClick={() => remove(car)}>🗑 Supprimer</button>
                    </div>
                  </div>
                  {isExpanded && (
                    <>
                      <ServicesManager car={car} onKmUpdate={updateCarKm} />
                      <ReservationManager car={car} onChange={load} onKmUpdate={updateCarKm} />
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
