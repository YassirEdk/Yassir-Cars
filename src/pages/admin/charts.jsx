// ── Themed chart building blocks (Recharts) ──────────────────────────────────
// Small wrappers so every chart on the dashboard shares the same look, fonts
// and number formatting. Each one fills the width of its parent card.
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell,
  PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, LabelList,
} from 'recharts'
import { formatKm } from './format'

// Brand-aligned palette (matches the admin button colours).
export const C = {
  blue: '#0d5fab', green: '#15803d', red: '#dc2626',
  purple: '#6d28d9', amber: '#d97706', grid: '#e5e7eb', axis: '#94a3b8',
}
export const STATUS_COLOR = { available: C.green, rented: C.blue, damaged: C.red }

const grouped = (v) => formatKm(Math.round(Number(v) || 0))
export const money = (v, cur) => `${grouped(v)} ${cur}`

// Shared tooltip card so all charts pop the same styled box.
function Box({ title, rows }) {
  return (
    <div className="admin-chart-tip">
      {title && <strong>{title}</strong>}
      {rows.map((r, i) => (
        <span key={i}><i style={{ background: r.color }} />{r.label}: <b>{r.value}</b></span>
      ))}
    </div>
  )
}

/* ── Revenue (area) + rentals per month ───────────────────────────────────── */
export function RevenueArea({ data, currency, height = 260 }) {
  const tip = ({ active, payload, label }) =>
    active && payload?.length ? (
      <Box title={label} rows={[
        { label: 'Revenu', value: money(payload[0].payload.revenue, currency), color: C.blue },
        { label: 'Locations', value: payload[0].payload.rentals, color: C.purple },
      ]} />
    ) : null
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.blue} stopOpacity={0.35} />
            <stop offset="100%" stopColor={C.blue} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: C.axis }} tickLine={false} axisLine={{ stroke: C.grid }} />
        <YAxis tick={{ fontSize: 11, fill: C.axis }} tickLine={false} axisLine={false}
               width={48} tickFormatter={grouped} />
        <Tooltip content={tip} cursor={{ stroke: C.blue, strokeOpacity: 0.2 }} />
        <Area type="monotone" dataKey="revenue" stroke={C.blue} strokeWidth={2.5}
              fill="url(#revFill)" dot={{ r: 2.5, fill: C.blue }} activeDot={{ r: 4 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/* ── Horizontal ranking bars (rentals per car / km per car) ───────────────── */
export function BarRanking({ data, color = C.blue, unit = '', currency, onSelect, height }) {
  const h = height ?? Math.max(140, data.length * 38 + 24)
  const fmt = (v) => currency ? money(v, currency) : `${grouped(v)}${unit ? ' ' + unit : ''}`
  const tip = ({ active, payload }) =>
    active && payload?.length ? (
      <Box title={payload[0].payload.name}
           rows={[{ label: 'Total', value: fmt(payload[0].value), color }]} />
    ) : null
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: C.axis }} tickLine={false}
               axisLine={false} tickFormatter={grouped} />
        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: '#334155' }}
               tickLine={false} axisLine={false} />
        <Tooltip content={tip} cursor={{ fill: 'rgba(13,95,171,.06)' }} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={26}
             cursor={onSelect ? 'pointer' : undefined}
             onClick={onSelect ? (d) => onSelect(d?.id ?? d?.payload?.id) : undefined}>
          {data.map((d) => <Cell key={d.id} fill={color} />)}
          <LabelList dataKey="value" position="right" formatter={fmt}
                     style={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ── Fleet status donut ───────────────────────────────────────────────────── */
export function StatusDonut({ status, height = 260 }) {
  const data = [
    { key: 'available', name: 'Disponibles', value: status.available, color: C.green },
    { key: 'rented',    name: 'En location', value: status.rented,    color: C.blue },
    { key: 'damaged',   name: 'Endommagées', value: status.damaged,   color: C.red },
  ].filter(d => d.value > 0)
  const total = data.reduce((s, d) => s + d.value, 0)
  const tip = ({ active, payload }) =>
    active && payload?.length ? (
      <Box rows={[{
        label: payload[0].name,
        value: `${payload[0].value} (${Math.round((payload[0].value / total) * 100)}%)`,
        color: payload[0].payload.color,
      }]} />
    ) : null
  return (
    <div className="admin-donut-wrap">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="90%"
               paddingAngle={data.length > 1 ? 2 : 0} stroke="none">
            {data.map(d => <Cell key={d.key} fill={d.color} />)}
          </Pie>
          <Tooltip content={tip} />
        </PieChart>
      </ResponsiveContainer>
      <div className="admin-donut-center">
        <strong>{total}</strong><span>unités</span>
      </div>
    </div>
  )
}
