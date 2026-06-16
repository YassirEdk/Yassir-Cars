import { useState, useRef } from 'react'
import { showError, confirmAsync } from '../../components/AdminDialog'
import { colorName } from '../../data'
import { deleteCar, setCarDamaged, setCarOrder } from '../../lib/cars'
import { Ico } from './Icons'
import { formatKm } from './format'
import { carStats } from './stats'

const STATUS_META = {
  available: { label: 'Disponible', cls: 'is-available' },
  rented:    { label: 'En location', cls: 'is-rented' },
  damaged:   { label: 'Endommagée', cls: 'is-damaged' },
}

/* ── Fleet list: manage units, then click one to open its dashboard ───────── */
export default function CarsList({ cars, setCars, load, loading, loadError, onEdit, onOpenCar }) {
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const visible = cars
    .filter(c => !q || c.name?.toLowerCase().includes(q) || c.immatriculation?.toLowerCase().includes(q))
    .sort((a, b) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name))

  const remove = async (car) => {
    if (!await confirmAsync(`Supprimer « ${car.name} » ? Cette action est définitive.`, { confirmLabel: 'Supprimer', danger: true })) return
    try { await deleteCar(car.id); load() }
    catch (e) { showError('Erreur : ' + e.message) }
  }

  // ── Drag-to-reorder (disabled while a search filter is active) ─────────────
  const dragId = useRef(null)
  const [dragOverId, setDragOverId] = useState(null)
  const canReorder = !q

  const onDrop = async (targetId) => {
    const fromId = dragId.current
    dragId.current = null
    setDragOverId(null)
    if (!fromId || fromId === targetId) return
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
    <>
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
            const st = carStats(car)
            const meta = STATUS_META[st.status]
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
                <div className="admin-car__photo" onClick={() => onOpenCar(car.id)} style={{ cursor: 'pointer' }}>
                  {car.photo ? <img src={car.photo} alt={car.name} /> : <span>—</span>}
                </div>
                <div className="admin-car__main">
                  <div className="admin-car__top">
                    <div className="admin-car__title-row" onClick={() => onOpenCar(car.id)} style={{ cursor: 'pointer', flex: 1 }}>
                      <h3>{car.name} <span className={`admin-status-pill ${meta.cls}`}>{meta.label}</span></h3>
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
                      <button className="admin-btn admin-btn--sm admin-btn--primary" onClick={() => onOpenCar(car.id)}><Ico name="gauge" /> Dashboard</button>
                      <button className="admin-btn admin-btn--sm admin-btn--edit" onClick={() => onEdit(car)}>✏ Modifier</button>
                      <button className="admin-btn admin-btn--sm admin-btn--delcar" onClick={() => remove(car)}>🗑 Supprimer</button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
