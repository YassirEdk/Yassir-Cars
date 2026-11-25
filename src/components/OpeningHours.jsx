import Icon from './Icon'

/* The opening hours, with whether the agency answers right now — told in
   Morocco's time, wherever the visitor is. */
const SLOTS = [
  { label: 'Lundi – samedi', days: [1, 2, 3, 4, 5, 6], open: 8, close: 20 },
  { label: 'Dimanche', days: [0], open: 9, close: 18 },
]
const DAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
const slotOf = (day) => SLOTS.find(s => s.days.includes(day))

function moroccoNow() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Casablanca', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
    }).formatToParts(new Date()).map(p => [p.type, p.value]),
  )
  return { day: DAYS[parts.weekday], hour: Number(parts.hour) + Number(parts.minute) / 60 }
}

function statusNow() {
  const { day, hour } = moroccoNow()
  const today = slotOf(day)
  if (hour >= today.open && hour < today.close) return { open: true, day, label: 'Ouvert', detail: `jusqu’à ${today.close}h` }
  if (hour < today.open) return { open: false, day, label: 'Fermé', detail: `ouvre à ${today.open}h` }
  return { open: false, day, label: 'Fermé', detail: `ouvre demain à ${slotOf((day + 1) % 7).open}h` }
}

export default function OpeningHours({ className = '' }) {
  const status = statusNow()
  return (
    <div className={`hours ${className}`}>
      <div className="hours__head">
        <span className="hours__title"><Icon name="clock" /> Horaires</span>
        <span className={`hours__status ${status.open ? 'is-open' : 'is-closed'}`} role="status">
          <span className="hours__dot" aria-hidden="true" />
          <strong>{status.label}</strong>
          <span className="hours__detail">{status.detail}</span>
        </span>
      </div>
      <dl className="hours__rows">
        {SLOTS.map(s => (
          <div key={s.label} className={`hours__row ${s.days.includes(status.day) ? 'is-today' : ''}`}>
            <dt>{s.label}</dt>
            <dd>{s.open}h – {s.close}h</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
