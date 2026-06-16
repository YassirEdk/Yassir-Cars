import { useMemo } from 'react'
import { Ico } from './Icons'
import { formatKm } from './format'
import {
  fleetTotals, fleetStatus, monthlySeries, ranking, fleetCurrency,
} from './stats'
import { RevenueArea, BarRanking, StatusDonut, money, C, STATUS_COLOR } from './charts'

// One number tile in the summary strip at the top of the dashboard.
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

function ChartCard({ title, hint, children, className = '' }) {
  return (
    <section className={`admin-chart-card ${className}`}>
      <header className="admin-chart-card__head">
        <h3>{title}</h3>
        {hint && <span className="admin-muted">{hint}</span>}
      </header>
      {children}
    </section>
  )
}

/* ── Analytics dashboard: fleet-wide graphs (the landing view) ─────────────── */
export default function Overview({ cars, onOpenCar }) {
  const cur = useMemo(() => fleetCurrency(cars), [cars])
  const totals = useMemo(() => fleetTotals(cars), [cars])
  const status = useMemo(() => fleetStatus(cars), [cars])
  const series = useMemo(() => monthlySeries(cars), [cars])
  const byRentals = useMemo(() => ranking(cars, s => s.rentalsTotal), [cars])
  const byKm = useMemo(() => ranking(cars, s => s.kmTotal), [cars])

  const hasRevenue = series.some(m => m.revenue > 0)

  return (
    <div className="admin-dash">
      <div className="admin-stats-row">
        <Stat icon="money"    label="Revenu estimé"        value={money(totals.revenue, cur)} tint={C.blue} />
        <Stat icon="calendar" label="Locations terminées"  value={totals.completed}            tint={C.green} />
        <Stat icon="car"      label="En location"          value={totals.ongoing}              tint={C.purple} />
        <Stat icon="user"     label="Réservations à venir" value={totals.upcoming}             tint={C.amber} />
        <Stat icon="gauge"    label="Km parcourus"         value={formatKm(totals.km) + ' km'} tint={C.red} />
      </div>

      <div className="admin-charts-grid">
        <ChartCard title="Revenu par mois" hint="locations terminées" className="admin-chart-card--wide">
          {hasRevenue
            ? <RevenueArea data={series} currency={cur} />
            : <p className="admin-chart-empty">Aucune location terminée pour l'instant.</p>}
        </ChartCard>

        <ChartCard title="État de la flotte">
          {totals.units > 0
            ? <>
                <StatusDonut status={status} />
                <div className="admin-donut-legend">
                  {[['available', 'Disponibles'], ['rented', 'En location'], ['damaged', 'Endommagées']].map(([k, lbl]) => (
                    <span key={k}><i style={{ background: STATUS_COLOR[k] }} />{lbl} <b>{status[k]}</b></span>
                  ))}
                </div>
              </>
            : <p className="admin-chart-empty">Aucune voiture.</p>}
        </ChartCard>

        <ChartCard title="Locations par voiture" hint={byRentals.length ? 'cliquez une barre' : ''}>
          {byRentals.length
            ? <BarRanking data={byRentals} color={C.blue} unit="loc." onSelect={onOpenCar} />
            : <p className="admin-chart-empty">Aucune location enregistrée.</p>}
        </ChartCard>

        <ChartCard title="Km parcourus par voiture" hint={byKm.length ? 'cliquez une barre' : ''}>
          {byKm.length
            ? <BarRanking data={byKm} color={C.green} unit="km" onSelect={onOpenCar} />
            : <p className="admin-chart-empty">Aucun kilométrage enregistré.</p>}
        </ChartCard>
      </div>
    </div>
  )
}
