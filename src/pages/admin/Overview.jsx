import { useMemo, useState } from 'react'
import { Ico } from './Icons'
import { formatKm } from './format'
import {
  fleetTotals, fleetStatus, monthlySeries, ranking, fleetCurrency,
  periodRange, scopeCars, dailySeries, yearSeries,
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
const PERIODS = [
  { key: 'day',   label: 'Aujourd’hui' },
  { key: 'month', label: 'Ce mois' },
  { key: 'year',  label: 'Cette année' },
  { key: 'all',   label: 'Tout' },
]

export default function Overview({ cars, onOpenCar }) {
  const [period, setPeriod] = useState('month')
  const range = useMemo(() => periodRange(period), [period])
  const scoped = useMemo(() => scopeCars(cars, range), [cars, range])

  const cur = useMemo(() => fleetCurrency(cars), [cars])
  const totals = useMemo(() => fleetTotals(scoped), [scoped])
  const status = useMemo(() => fleetStatus(cars), [cars])
  const byRentals = useMemo(() => ranking(scoped, s => s.rentalsTotal), [scoped])
  const byKm = useMemo(() => ranking(scoped, s => s.kmTotal), [scoped])

  // Revenue chart adapts to the period: last 7 days / days of the month /
  // months of the year / every month (all time).
  const chart = useMemo(() => {
    const now = new Date()
    if (period === 'day') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
      const k = (d) => d.toLocaleDateString('en-CA')
      return { title: 'Revenu des 7 derniers jours', data: dailySeries(cars, k(start), k(now)) }
    }
    if (period === 'month') return { title: 'Revenu par jour (ce mois)', data: dailySeries(cars, range.from, range.to) }
    if (period === 'year')  return { title: `Revenu par mois (${now.getFullYear()})`, data: yearSeries(cars, now.getFullYear()) }
    return { title: 'Revenu par mois', data: monthlySeries(cars) }
  }, [cars, period, range])

  const hasRevenue = chart.data.some(m => m.revenue > 0)

  return (
    <div className="admin-dash">
      <div className="admin-rtabs admin-dash__periods">
        {PERIODS.map(p => (
          <button
            key={p.key}
            className={`admin-rtab is-upcoming${period === p.key ? ' is-active' : ''}`}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="admin-stats-row">
        <Stat icon="money"    label="Revenu estimé"        value={money(totals.revenue, cur)} tint={C.blue} />
        <Stat icon="calendar" label="Locations terminées"  value={totals.completed}            tint={C.green} />
        <Stat icon="car"      label="En location"          value={totals.ongoing}              tint={C.purple} />
        <Stat icon="user"     label="Réservations à venir" value={totals.upcoming}             tint={C.amber} />
        <Stat icon="gauge"    label="Km parcourus"         value={formatKm(totals.km) + ' km'} tint={C.red} />
      </div>

      <div className="admin-charts-grid">
        <ChartCard title={chart.title} hint="locations terminées" className="admin-chart-card--wide">
          {hasRevenue
            ? <RevenueArea data={chart.data} currency={cur} />
            : <p className="admin-chart-empty">Aucune location terminée sur cette période.</p>}
        </ChartCard>

        <ChartCard title="État de la flotte" hint="en temps réel">
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
