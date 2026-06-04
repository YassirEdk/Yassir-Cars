import { useState, useRef, useEffect } from 'react'

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]
const MONTHS_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
const WEEKDAYS = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di']

const toISO = (y, m, d) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

const formatDisplay = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  return `${String(d).padStart(2, '0')}-${MONTHS_SHORT[m - 1]}-${y}`
}

export default function DatePicker({ value, onChange, min, placeholder, className, blockedDates, allowPast }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  // Which month the calendar is showing
  const initial = value ? value.split('-').map(Number) : null
  const [view, setView] = useState(() => {
    const base = initial ? new Date(initial[0], initial[1] - 1, 1) : new Date()
    return { year: base.getFullYear(), month: base.getMonth() }
  })

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Keep the view in sync when opening with an existing value
  const openCalendar = () => {
    if (value) {
      const [y, m] = value.split('-').map(Number)
      setView({ year: y, month: m - 1 })
    }
    setOpen(o => !o)
  }

  const { year, month } = view
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7 // Mon = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayISO = new Date().toISOString().split('T')[0]

  const cells = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const prevMonth = () => setView(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 })
  const nextMonth = () => setView(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 })

  const pick = (d) => {
    onChange(toISO(year, month, d))
    setOpen(false)
  }

  return (
    <div className="datepicker" ref={wrapRef}>
      <input
        type="text"
        readOnly
        value={formatDisplay(value)}
        placeholder={placeholder}
        onClick={openCalendar}
        className={`datepicker__input ${className || ''}`}
      />
      <span className="datepicker__icon" onClick={openCalendar}>📅</span>

      {open && (
        <div className="datepicker__pop">
          <div className="datepicker__head">
            <button type="button" className="datepicker__nav" onClick={prevMonth}>‹</button>
            <span className="datepicker__title">{MONTHS[month]} {year}</span>
            <button type="button" className="datepicker__nav" onClick={nextMonth}>›</button>
          </div>

          <div className="datepicker__grid datepicker__grid--days">
            {WEEKDAYS.map(w => <span key={w} className="datepicker__wd">{w}</span>)}
          </div>

          <div className="datepicker__grid">
            {cells.map((d, i) => {
              if (d === null) return <span key={`b${i}`} />
              const iso = toISO(year, month, d)
              const disabled = (min && iso < min) || (!allowPast && iso < todayISO)
              const isBlocked = blockedDates?.has(iso)
              const isSelected = iso === value
              const isToday = iso === todayISO
              return (
                <button
                  type="button"
                  key={iso}
                  disabled={disabled || isBlocked}
                  onClick={() => pick(d)}
                  className={`datepicker__day${isSelected ? ' is-selected' : ''}${isToday ? ' is-today' : ''}${isBlocked ? ' is-blocked' : ''}`}
                >
                  {d}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
