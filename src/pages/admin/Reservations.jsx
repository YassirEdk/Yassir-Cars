import { useMemo, useState } from 'react'
import { Ico } from './Icons'
import { formatDate, formatKm, kmDone } from './format'

const TABS = [
  { key: 'reservee', label: 'À venir',    cls: 'is-upcoming' },
  { key: 'en_cours', label: 'En cours',   cls: 'is-ongoing' },
  { key: 'terminee', label: 'Historique', cls: 'is-history' },
]

/* ── Fleet-wide reservations, grouped by stage, with search ───────────────── */
export default function Reservations({ cars, onOpenCar }) {
  const [tab, setTab] = useState('reservee')
  const [q, setQ] = useState('')

  // Flatten every period across the fleet, tagging it with its car.
  const all = useMemo(() => {
    const out = []
    for (const car of cars)
      for (const p of car.unavailable ?? [])
        out.push({ ...p, carId: car.id, carName: car.name, plate: car.immatriculation })
    return out
  }, [cars])

  const counts = useMemo(() => {
    const c = { reservee: 0, en_cours: 0, terminee: 0 }
    for (const r of all) c[r.status ?? 'reservee']++
    return c
  }, [all])

  const ql = q.trim().toLowerCase()
  const rows = all
    .filter(r => (r.status ?? 'reservee') === tab)
    .filter(r => !ql || `${r.clientName || ''} ${r.cin || ''} ${r.tel || ''} ${r.carName || ''} ${r.plate || ''}`.toLowerCase().includes(ql))
    .sort((a, b) => tab === 'terminee'
      ? (b.start || '').localeCompare(a.start || '')
      : (a.start || '').localeCompare(b.start || ''))

  const ongoing = tab === 'en_cours'
  const history = tab === 'terminee'

  return (
    <div className="admin-reservations">
      <div className="admin-rtabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`admin-rtab ${t.cls}${tab === t.key ? ' is-active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}<span className="admin-rtab__count">{counts[t.key]}</span>
          </button>
        ))}
        <div className="admin-rtabs__spacer" />
        <input
          type="search" className="admin-search admin-rtabs__search"
          placeholder="Rechercher client, CIN, voiture…"
          value={q} onChange={e => setQ(e.target.value)}
        />
      </div>

      {rows.length === 0 ? (
        <p className="admin-muted admin-pad">Aucune réservation dans cette catégorie.</p>
      ) : (
        <div className="admin-card-table">
          <div className="admin-hist-table-wrap">
            <table className="admin-rtable">
              <thead>
                <tr>
                  <th>Voiture</th>
                  <th>Client</th>
                  <th>Période</th>
                  <th>Téléphone</th>
                  <th>CIN</th>
                  {ongoing && <th>Départ km</th>}
                  {history && <th>Parcourus</th>}
                  {history && <th>État</th>}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className={r.damaged ? 'admin-rtable__row--damaged' : ''}>
                    <td>
                      <button className="admin-rtable__car" onClick={() => onOpenCar(r.carId)}>
                        {r.carName}{r.plate && <span className="admin-plate">{r.plate}</span>}
                      </button>
                    </td>
                    <td>
                      {r.clientName ? <strong>{r.clientName}</strong> : '—'}
                      {(r.secondDriverName || r.secondDriverCin || r.secondDriverLicence) && <span className="admin-2nd-badge">👥 2e</span>}
                    </td>
                    <td className="admin-hist-table__dates">{formatDate(r.start)} → {formatDate(r.end)}</td>
                    <td>{r.tel || '—'}</td>
                    <td>{r.cin || '—'}</td>
                    {ongoing && <td>{r.departureKm != null ? formatKm(r.departureKm) + ' km' : '—'}</td>}
                    {history && <td className="admin-hist-table__dist">{kmDone(r) != null ? formatKm(kmDone(r)) + ' km' : '—'}</td>}
                    {history && <td>{r.damaged ? <span className="admin-damage-badge">🛠 Endommagée</span> : <span className="admin-ok-badge">✓ OK</span>}</td>}
                    <td>
                      <button className="admin-btn admin-btn--sm admin-btn--edit" onClick={() => onOpenCar(r.carId)}>
                        <Ico name="gauge" /> Gérer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
