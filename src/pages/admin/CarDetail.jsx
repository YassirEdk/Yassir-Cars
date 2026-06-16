import { useMemo } from 'react'
import { colorName } from '../../data'
import { Ico } from './Icons'
import { formatKm, formatDate, kmDone } from './format'
import { carStats, monthlySeries } from './stats'
import { RevenueArea, BarRanking, money, C } from './charts'
import ServicesManager from './ServicesManager'
import ReservationManager from './ReservationManager'

const STATUS_META = {
  available: { label: 'Disponible', cls: 'is-available' },
  rented:    { label: 'En location', cls: 'is-rented' },
  damaged:   { label: 'Endommagée', cls: 'is-damaged' },
}

function Stat({ icon, label, value, tint }) {
  return (
    <div className="admin-stat">
      <span className="admin-stat__icon" style={{ background: tint + '1a', color: tint }}><Ico name={icon} /></span>
      <div className="admin-stat__body">
        <span className="admin-stat__value">{value}</span>
        <span className="admin-stat__label">{label}</span>
      </div>
    </div>
  )
}

/* ── Per-car dashboard: its own charts + full reservation management ───────── */
export default function CarDetail({ car, onChange, onKmUpdate, onEdit }) {
  const cur = car.currency || 'MAD'
  const st = useMemo(() => carStats(car), [car])
  const series = useMemo(() => monthlySeries([car]), [car])
  const meta = STATUS_META[st.status]

  // Distance driven on each finished rental, oldest first → bar chart.
  const kmPerRental = useMemo(() => (car.unavailable ?? [])
    .filter(r => r.status === 'terminee' && kmDone(r) != null)
    .sort((a, b) => (a.start || '').localeCompare(b.start || ''))
    .map(r => ({ id: r.id, name: r.clientName || formatDate(r.start), value: kmDone(r) })),
    [car])

  const hasRevenue = series.some(m => m.revenue > 0)

  return (
    <div className="admin-detail">
      <div className="admin-detail__hero">
        <div className="admin-detail__photo">
          {car.photo ? <img src={car.photo} alt={car.name} /> : <span>—</span>}
        </div>
        <div className="admin-detail__id">
          <h2>{car.name} <span className={`admin-status-pill ${meta.cls}`}>{meta.label}</span></h2>
          <div className="admin-car__meta">
            <span className="admin-tag">{car.category}</span>
            {car.color && <span className="admin-dot" style={{ background: car.color }} title={colorName(car.color)} />}
            {car.immatriculation && <span className="admin-plate">{car.immatriculation}</span>}
            <span className="admin-price">{car.price} {car.currency}/j</span>
            {car.lastKm != null && <span className="admin-last-km"><Ico name="gauge" /> {formatKm(car.lastKm)} km</span>}
          </div>
        </div>
        <button className="admin-btn admin-btn--sm admin-btn--edit admin-detail__edit" onClick={() => onEdit(car)}>✏ Modifier</button>
      </div>

      <div className="admin-stats-row">
        <Stat icon="money"    label="Revenu estimé"       value={money(st.revenue, cur)}       tint={C.blue} />
        <Stat icon="calendar" label="Locations terminées" value={st.completed}                 tint={C.green} />
        <Stat icon="user"     label="Réservations à venir" value={st.upcoming}                  tint={C.amber} />
        <Stat icon="gauge"    label="Km parcourus"        value={formatKm(st.kmTotal) + ' km'} tint={C.red} />
      </div>

      <div className="admin-charts-grid">
        <section className="admin-chart-card admin-chart-card--wide">
          <header className="admin-chart-card__head"><h3>Revenu par mois</h3><span className="admin-muted">locations terminées</span></header>
          {hasRevenue
            ? <RevenueArea data={series} currency={cur} />
            : <p className="admin-chart-empty">Aucune location terminée pour cette voiture.</p>}
        </section>
        <section className="admin-chart-card">
          <header className="admin-chart-card__head"><h3>Km par location</h3></header>
          {kmPerRental.length
            ? <BarRanking data={kmPerRental} color={C.green} unit="km" />
            : <p className="admin-chart-empty">Aucun kilométrage enregistré.</p>}
        </section>
      </div>

      <div className="admin-detail__manage">
        <ServicesManager car={car} onKmUpdate={onKmUpdate} />
        <ReservationManager car={car} onChange={onChange} onKmUpdate={onKmUpdate} />
      </div>
    </div>
  )
}
