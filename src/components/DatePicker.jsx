import { useState, useRef, useEffect } from 'react'
import Icon from './Icon'
import { useOpensUp } from '../hooks/useOpensUp'
import { daysBetween, formatFriendlyDate, formatLongDate } from '../lib/dates'

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

// `openKey`: bump this counter from the parent to pop the calendar open — used
// to chain "date de début" → "date de fin" without a second click.
// `flip`: open above the field when the calendar doesn't fit below it.
// `friendly`: "Sam. 28 nov." instead of "28-Nov-2026".
export default function DatePicker({ value, onChange, min, placeholder, className, blockedDates, allowPast, highlight, openKey, ariaLabel, friendly = false, flip = false }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const popRef = useRef(null)
  const inputRef = useRef(null)
  // Day the arrow keys moved to, focused once its month is on screen.
  const focusDay = useRef('')
  const up = useOpensUp(flip, open, wrapRef, popRef)

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

  // Parent asked us to open (e.g. the start date was just picked). Show the
  // month of the current value, or of the earliest selectable day.
  useEffect(() => {
    if (!openKey) return
    const anchor = value || min
    if (anchor) {
      const [y, m] = anchor.split('-').map(Number)
      setView({ year: y, month: m - 1 })
    }
    setOpen(true)
    // The outline must be on the field being filled, not on the one before.
    inputRef.current?.focus({ preventScroll: true })
  }, [openKey])   // eslint-disable-line react-hooks/exhaustive-deps

  // Opens on the month of the value, or of the first day that can be picked.
  const openCalendar = () => {
    const anchor = value || min
    if (!open && anchor) {
      const [y, m] = anchor.split('-').map(Number)
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
  // Always six weeks where the calendar hangs by its bottom or its middle: its
  // arrows would move under the finger from one month to the next.
  const spare = 42 - cells.length

  const prevMonth = () => setView(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 })
  const nextMonth = () => setView(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 })

  // The return calendar greys out the first days after the start: say why.
  const least = highlight && min ? daysBetween(highlight, min) : 0

  // Nothing to pick before this month.
  const earliest = min || (allowPast ? '' : todayISO)
  const atStart = Boolean(earliest) && toISO(year, month, 1).slice(0, 7) <= earliest.slice(0, 7)

  const isOff = (iso) => Boolean((min && iso < min) || (!allowPast && iso < todayISO) || blockedDates?.has(iso))

  const pick = (d) => {
    onChange(toISO(year, month, d))
    setOpen(false)
    inputRef.current?.focus({ preventScroll: true })
  }

  // Focus the day asked for by the keyboard (every render: the month may have
  // just changed).
  useEffect(() => {
    if (!open || !focusDay.current) return
    popRef.current?.querySelector(`[data-day="${focusDay.current}"]`)?.focus({ preventScroll: true })
    focusDay.current = ''
  })

  // Moves to `iso`, or to the next selectable day in the direction of travel.
  const moveTo = (iso, dir) => {
    const [y, m, d] = iso.split('-').map(Number)
    const day = new Date(y, m - 1, d)
    for (let i = 0; i < 400; i++) {
      const next = toISO(day.getFullYear(), day.getMonth(), day.getDate())
      if (!isOff(next)) {
        focusDay.current = next
        setView({ year: day.getFullYear(), month: day.getMonth() })
        return
      }
      day.setDate(day.getDate() + dir)
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Escape' && open) {
      e.stopPropagation()
      setOpen(false)
      inputRef.current?.focus({ preventScroll: true })
      return
    }
    if (e.target === inputRef.current) {
      if (!['Enter', ' ', 'ArrowDown'].includes(e.key)) return
      e.preventDefault()                // Enter would submit the form
      setOpen(true)
      const from = [value, min, todayISO].find(Boolean)
      moveTo(from, 1)
      return
    }
    const day = e.target.dataset?.day
    const jump = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, PageUp: -30, PageDown: 30 }[e.key]
    if (!day || !jump) return
    e.preventDefault()
    const [y, m, d] = day.split('-').map(Number)
    const to = new Date(y, m - 1, d + jump)
    const iso = toISO(to.getFullYear(), to.getMonth(), to.getDate())
    // Backwards into days that can't be picked: stay where we are.
    if (jump < 0 && isOff(iso)) return
    moveTo(iso, 1)
  }

  return (
    <div className="datepicker" ref={wrapRef} onKeyDown={onKeyDown}>
      <input
        ref={inputRef}
        type="text"
        readOnly
        role="combobox"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        value={friendly ? formatFriendlyDate(value) : formatDisplay(value)}
        placeholder={placeholder}
        onClick={openCalendar}
        className={`datepicker__input ${className || ''}`}
      />
      <span className="datepicker__icon" onClick={openCalendar}><Icon name="calendar" /></span>

      {open && (
        <div className={`datepicker__pop${up ? ' datepicker__pop--up' : ''}`} ref={popRef} role="dialog" aria-label={ariaLabel ?? 'Choisir une date'}>
          <div className="datepicker__head">
            <button type="button" className="datepicker__nav" onClick={prevMonth} disabled={atStart} aria-label="Mois précédent">
              <Icon name="caretLeft" size={13} /> {MONTHS_SHORT[(month + 11) % 12]}
            </button>
            <span className="datepicker__title" aria-live="polite">{MONTHS[month]} {year}</span>
            <button type="button" className="datepicker__nav datepicker__nav--next" onClick={nextMonth} aria-label="Mois suivant">
              {MONTHS_SHORT[(month + 1) % 12]} <Icon name="caretRight" size={13} />
            </button>
          </div>

          <div className="datepicker__grid datepicker__grid--days">
            {WEEKDAYS.map(w => <span key={w} className="datepicker__wd">{w}</span>)}
          </div>

          <div className="datepicker__grid">
            {cells.map((d, i) => {
              if (d === null) return <span key={`b${i}`} />
              const iso = toISO(year, month, d)
              const isBlocked = blockedDates?.has(iso)
              const isSelected = iso === value
              const isToday = iso === todayISO
              const isHighlight = highlight && iso === highlight
              return (
                <button
                  type="button"
                  key={iso}
                  data-day={iso}
                  disabled={isOff(iso)}
                  onClick={() => pick(d)}
                  aria-label={formatLongDate(iso)}
                  aria-pressed={isSelected}
                  title={isHighlight ? 'Date de départ' : undefined}
                  className={`datepicker__day${isSelected ? ' is-selected' : ''}${isToday ? ' is-today' : ''}${isBlocked ? ' is-blocked' : ''}${isHighlight ? ' is-highlight' : ''}`}
                >
                  {d}
                </button>
              )
            })}
            {Array.from({ length: spare }, (_, i) => <span key={`s${i}`} className="datepicker__spare" />)}
          </div>

          {least > 1 && <p className="datepicker__note">{ariaLabel ?? 'Date de retour'} : {least} jours minimum</p>}
        </div>
      )}
    </div>
  )
}
