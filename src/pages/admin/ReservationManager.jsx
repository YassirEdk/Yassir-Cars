import React, { useState, useMemo } from 'react'
import DatePicker from '../../components/DatePicker'
import { showError, confirmAsync } from '../../components/AdminDialog'
import {
  addReservation, updateReservation, deletePeriod,
  confirmPickup, confirmReturn, updateDepartureKm, findCinConflict, findCinDamage,
} from '../../lib/cars'
import { Ico } from './Icons'
import { formatKm, formatDate, kmDone } from './format'
import ListFilters from './ListFilters'

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

/* ── Pop-up: all reservations / rental history with search + date range ───── */
function ReservationsModal({ title, reservations, onClose, onRemove, removeLabel = 'Annuler', history = false }) {
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [detailR, setDetailR] = useState(null)

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
              <table className="admin-hist-table admin-hist-table--history">
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
                    <tr key={r.id} className={r.damaged ? 'admin-hist-table__row--damaged' : ''}>
                      <td className="admin-hist-table__td--click" onClick={() => setDetailR(r)}>
                        {r.clientName ? <strong className="admin-resa-name-link">{r.clientName}</strong> : '—'}
                        {(r.secondDriverName || r.secondDriverCin || r.secondDriverLicence) && <span className="admin-2nd-badge">👥 2ème conducteur</span>}
                      </td>
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
                      <td className="admin-hist-table__td--click" onClick={() => setDetailR(r)}>
                        {r.clientName ? <strong className="admin-resa-name-link">{r.clientName}</strong> : '—'}
                        {(r.secondDriverName || r.secondDriverCin || r.secondDriverLicence) && <span className="admin-2nd-badge">👥 2ème conducteur</span>}
                      </td>
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
      {detailR && (
        <div className="admin-modal" style={{ zIndex: 1200 }} onClick={() => setDetailR(null)}>
          <div className="admin-resa-detail" onClick={e => e.stopPropagation()}>
            <div className="admin-resa-detail__head">
              <h3>📋 Détails de la réservation</h3>
              <button className="phone-modal__close" onClick={() => setDetailR(null)} aria-label="Fermer">✕</button>
            </div>
            <div className="admin-resa-detail__body">
              <div className="admin-resa-detail__section">
                <span className="admin-resa-detail__label">Client</span>
                <span className="admin-resa-detail__value">{detailR.clientName || '—'}</span>
              </div>
              <div className="admin-resa-detail__section">
                <span className="admin-resa-detail__label">CIN</span>
                <span className="admin-resa-detail__value">{detailR.cin || '—'}</span>
              </div>
              <div className="admin-resa-detail__section">
                <span className="admin-resa-detail__label">Téléphone</span>
                <span className="admin-resa-detail__value">{detailR.tel || '—'}</span>
              </div>
              <div className="admin-resa-detail__section">
                <span className="admin-resa-detail__label">Période</span>
                <span className="admin-resa-detail__value">{formatDate(detailR.start)} → {formatDate(detailR.end)}</span>
              </div>
              <div className="admin-resa-detail__section">
                <span className="admin-resa-detail__label">N° permis</span>
                <span className="admin-resa-detail__value">{detailR.licenceNumber || '—'}</span>
              </div>
              {detailR.matriculation && (
                <div className="admin-resa-detail__section">
                  <span className="admin-resa-detail__label">Immatriculation</span>
                  <span className="admin-resa-detail__value">{detailR.matriculation}</span>
                </div>
              )}
              {detailR.departureKm != null && (
                <div className="admin-resa-detail__section">
                  <span className="admin-resa-detail__label">Départ km</span>
                  <span className="admin-resa-detail__value">{formatKm(detailR.departureKm)} km</span>
                </div>
              )}
              {detailR.returnKm != null && (
                <div className="admin-resa-detail__section">
                  <span className="admin-resa-detail__label">Retour km</span>
                  <span className="admin-resa-detail__value">{formatKm(detailR.returnKm)} km</span>
                </div>
              )}
              {(detailR.secondDriverName || detailR.secondDriverCin || detailR.secondDriverLicence) && (
                <>
                  <div className="admin-resa-detail__divider">2ème conducteur</div>
                  {detailR.secondDriverName && (
                    <div className="admin-resa-detail__section">
                      <span className="admin-resa-detail__label">Nom</span>
                      <span className="admin-resa-detail__value">{detailR.secondDriverName}</span>
                    </div>
                  )}
                  {detailR.secondDriverCin && (
                    <div className="admin-resa-detail__section">
                      <span className="admin-resa-detail__label">CIN</span>
                      <span className="admin-resa-detail__value">{detailR.secondDriverCin}</span>
                    </div>
                  )}
                  {detailR.secondDriverLicence && (
                    <div className="admin-resa-detail__section">
                      <span className="admin-resa-detail__label">N° permis</span>
                      <span className="admin-resa-detail__value">{detailR.secondDriverLicence}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
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

/* ── Reservations panel for one car ───────────────────────────────────────── */
const EMPTY_RESA = {
  clientName: '', cin: '', tel: '', licenceNumber: '',
  hasSecondDriver: false,
  secondDriverName: '', secondDriverCin: '', secondDriverLicence: '',
  start: '', end: '',
}

export default function ReservationManager({ car, onChange, onKmUpdate }) {
  const [open, setOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [histOpen, setHistOpen] = useState(false)
  const [confirming, setConfirming] = useState(null)     // id of the row whose km field is open
  const [editingR, setEditingR] = useState(null)         // reservation being edited in popup, or null
  const [editingKmId, setEditingKmId] = useState(null)  // id of ongoing row with km edit open
  const [ongoingError, setOngoingError] = useState(null) // id of the row that triggered the block
  const [detailR, setDetailR] = useState(null)           // reservation being viewed in detail popup
  const [form, setForm] = useState(EMPTY_RESA)
  const [formError, setFormError] = useState(null) // { message, conflict } | null
  const [cinConflict, setCinConflict] = useState(null) // existing name under same CIN, or null
  const [cinChecking, setCinChecking] = useState(false)
  const [damageWarn, setDamageWarn] = useState(false)  // CIN has a past damage record
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => {
    setFormError(null)
    if (k === 'cin' || k === 'clientName') setCinConflict(null)
    setForm(f => ({ ...f, [k]: e.target.value }))
  }
  const today = new Date().toISOString().split('T')[0]

  const closePopup = () => {
    setOpen(false); setEditingR(null); setForm(EMPTY_RESA)
    setFormError(null); setCinConflict(null); setDamageWarn(false)
  }

  const openEdit = (r) => {
    setEditingR(r)
    setForm({
      clientName: r.clientName || '', cin: r.cin || '', tel: r.tel || '',
      licenceNumber: r.licenceNumber || '',
      hasSecondDriver: !!(r.secondDriverName || r.secondDriverCin || r.secondDriverLicence),
      secondDriverName: r.secondDriverName || '', secondDriverCin: r.secondDriverCin || '',
      secondDriverLicence: r.secondDriverLicence || '',
      start: r.start || '', end: r.end || '',
    })
    setCinConflict(null); setFormError(null); setDamageWarn(false)
    setOpen(true)
  }

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
    // Overlap check — exclude the reservation being edited so its own dates don't block itself.
    const active = all.filter(r => r.status !== 'terminee' && (!editingR || r.id !== editingR.id))
    const conflict = active.find(r => r.start < form.end && r.end > form.start)
    if (conflict) return setFormError({ message: null, conflict })
    // Damage warning only for new reservations (client already accepted for edits).
    if (!editingR) {
      try {
        if (await findCinDamage(form.cin)) { setDamageWarn(true); return }
      } catch { /* network hiccup — don't block on it */ }
    }
    doSave()
  }

  const doSave = async () => {
    setBusy(true)
    // When "2ème conducteur" is unchecked, drop any second-driver values so they
    // aren't silently saved (e.g. after filling them in then unticking the box).
    const payload = form.hasSecondDriver
      ? form
      : { ...form, secondDriverName: '', secondDriverCin: '', secondDriverLicence: '' }
    try {
      if (editingR) {
        await updateReservation(editingR.id, payload)
      } else {
        await addReservation(car.id, { ...payload, matriculation: car.immatriculation || null })
      }
      closePopup(); onChange()
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
  const giveBack = async (id, km, damaged) => {
    await confirmReturn(id, km, damaged, car.id)
    if (km != null && km !== '') onKmUpdate(car.id, Number(km))
    setConfirming(null)
    onChange()
  }

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
    const active = all.filter(r => r.status !== 'terminee' && (!editingR || r.id !== editingR.id))
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
  }, [all, editingR])

  const reserved = all.filter(r => (r.status ?? 'reservee') === 'reservee').sort(byNearest)
  const ongoing  = all.filter(r => r.status === 'en_cours').sort(byNearest)
  const history  = all.filter(r => r.status === 'terminee').sort(byStartDesc)

  return (
    <div className="admin-resa">
      <div className="admin-resa__head">
        <h4>📋 Réservations</h4>
        {!open && (
          <button className="admin-btn admin-btn--sm admin-btn--primary" onClick={() => { setEditingR(null); setForm(EMPTY_RESA); setOpen(true) }}>
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
                  <tr className="admin-hist-table__row--clickable">
                    <td className="admin-hist-table__td--click" onClick={() => setDetailR(r)}>
                      {r.clientName ? <strong className="admin-resa-name-link">{r.clientName}</strong> : '—'}
                      {(r.secondDriverName || r.secondDriverCin || r.secondDriverLicence) && <span className="admin-2nd-badge">👥 2ème conducteur</span>}
                    </td>
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
                          <button className="admin-btn admin-btn--sm admin-btn--edit" onClick={() => openEdit(r)}>✏ Modifier</button>
                          <button onClick={() => remove(r.id)} className="admin-link-del">Annuler</button>
                        </div>
                      )}
                    </td>
                  </tr>
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
                    <tr className="admin-hist-table__row--clickable">
                      <td className="admin-hist-table__td--click" onClick={() => setDetailR(r)}>
                        {r.clientName ? <strong className="admin-resa-name-link">{r.clientName}</strong> : '—'}
                        {(r.secondDriverName || r.secondDriverCin || r.secondDriverLicence) && <span className="admin-2nd-badge">👥 2ème conducteur</span>}
                      </td>
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
                            <button className="admin-btn admin-btn--sm admin-btn--edit" onClick={() => setEditingKmId(editingKmId === r.id ? null : r.id)}>✏ Modifier km</button>
                            <button onClick={() => remove(r.id)} className="admin-link-del">Annuler</button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {editingKmId === r.id && (
                      <tr key={r.id + '-edit'} className="admin-edit-row">
                        <td colSpan={6}>
                          <EditDepartureKm r={r} onSaved={() => { setEditingKmId(null); onChange() }} onCancel={() => setEditingKmId(null)} />
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
        <div className="admin-modal" onClick={e => { if (e.target.classList.contains('admin-modal')) closePopup() }}>
          <div className="admin-resa-popup">
            <div className="admin-resa-popup__head">
              <h3>{editingR ? `✏️ Modifier la réservation — ${car.name}` : `➕ Nouvelle réservation — ${car.name}`}</h3>
              <button className="phone-modal__close" onClick={closePopup} aria-label="Fermer">✕</button>
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
              <label>N° permis de conduire
                <input type="text" value={form.licenceNumber} onChange={set('licenceNumber')} />
              </label>
              <div className="admin-resa-grid__separator" />
              <label className="admin-resa-2nd-toggle resa-full">
                <input
                  type="checkbox"
                  checked={form.hasSecondDriver}
                  onChange={e => setForm(f => ({ ...f, hasSecondDriver: e.target.checked }))}
                />
                2ème conducteur
              </label>
              {form.hasSecondDriver && (<>
                <label>Nom du 2ème conducteur
                  <input type="text" value={form.secondDriverName} onChange={set('secondDriverName')} />
                </label>
                <label>CIN du 2ème conducteur
                  <input type="text" value={form.secondDriverCin} onChange={set('secondDriverCin')} />
                </label>
                <label className="resa-full">N° permis du 2ème conducteur
                  <input type="text" value={form.secondDriverLicence} onChange={set('secondDriverLicence')} />
                </label>
              </>)}
              <div className="admin-resa-grid__separator" />
              <label>Date de début *
                <DatePicker value={form.start} onChange={v => { setFormError(null); setForm(f => ({ ...f, start: v })) }} min={today} placeholder="JJ-MMM-AAAA" blockedDates={blockedDates} />
              </label>
              <label>Date de fin *
                <DatePicker value={form.end} onChange={v => { setFormError(null); setForm(f => ({ ...f, end: v })) }} min={form.start || today} placeholder="JJ-MMM-AAAA" blockedDates={blockedDates} />
              </label>
            </div>
            <div className="admin-resa-actions">
              <button className="admin-btn admin-btn--sm" onClick={closePopup}>Annuler</button>
              <button className="admin-btn admin-btn--sm admin-btn--primary" onClick={save} disabled={busy || cinChecking || !!cinConflict}>
                {busy ? 'Enregistrement…' : editingR ? 'Enregistrer les modifications' : 'Enregistrer la réservation'}
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

      {detailR && (
        <div className="admin-modal" style={{ zIndex: 1200 }} onClick={() => setDetailR(null)}>
          <div className="admin-resa-detail" onClick={e => e.stopPropagation()}>
            <div className="admin-resa-detail__head">
              <h3>📋 Détails de la réservation</h3>
              <button className="phone-modal__close" onClick={() => setDetailR(null)} aria-label="Fermer">✕</button>
            </div>
            <div className="admin-resa-detail__body">
              <div className="admin-resa-detail__section">
                <span className="admin-resa-detail__label">Client</span>
                <span className="admin-resa-detail__value">{detailR.clientName || '—'}</span>
              </div>
              <div className="admin-resa-detail__section">
                <span className="admin-resa-detail__label">CIN</span>
                <span className="admin-resa-detail__value">{detailR.cin || '—'}</span>
              </div>
              <div className="admin-resa-detail__section">
                <span className="admin-resa-detail__label">Téléphone</span>
                <span className="admin-resa-detail__value">{detailR.tel || '—'}</span>
              </div>
              <div className="admin-resa-detail__section">
                <span className="admin-resa-detail__label">Période</span>
                <span className="admin-resa-detail__value">{formatDate(detailR.start)} → {formatDate(detailR.end)}</span>
              </div>
              <div className="admin-resa-detail__section">
                <span className="admin-resa-detail__label">N° permis</span>
                <span className="admin-resa-detail__value">{detailR.licenceNumber || '—'}</span>
              </div>
              {detailR.matriculation && (
                <div className="admin-resa-detail__section">
                  <span className="admin-resa-detail__label">Immatriculation</span>
                  <span className="admin-resa-detail__value">{detailR.matriculation}</span>
                </div>
              )}
              {detailR.departureKm != null && (
                <div className="admin-resa-detail__section">
                  <span className="admin-resa-detail__label">Départ km</span>
                  <span className="admin-resa-detail__value">{formatKm(detailR.departureKm)} km</span>
                </div>
              )}
              {(detailR.secondDriverName || detailR.secondDriverCin || detailR.secondDriverLicence) && (
                <>
                  <div className="admin-resa-detail__divider">2ème conducteur</div>
                  {detailR.secondDriverName && (
                    <div className="admin-resa-detail__section">
                      <span className="admin-resa-detail__label">Nom</span>
                      <span className="admin-resa-detail__value">{detailR.secondDriverName}</span>
                    </div>
                  )}
                  {detailR.secondDriverCin && (
                    <div className="admin-resa-detail__section">
                      <span className="admin-resa-detail__label">CIN</span>
                      <span className="admin-resa-detail__value">{detailR.secondDriverCin}</span>
                    </div>
                  )}
                  {detailR.secondDriverLicence && (
                    <div className="admin-resa-detail__section">
                      <span className="admin-resa-detail__label">N° permis</span>
                      <span className="admin-resa-detail__value">{detailR.secondDriverLicence}</span>
                    </div>
                  )}
                </>
              )}
            </div>
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
