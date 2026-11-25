import { useState, useRef, useEffect, useMemo, useId } from 'react'
import Icon from './Icon'
import { useOpensUp } from '../hooks/useOpensUp'
import { popularCities, searchCities, isAirport, placeHint } from '../lib/cities'
import './selectmenu.css'

/* Place dropdown — the same list as SelectMenu, with a search box on top because
   there are 58 cities and the airports. Popular ones come first; typing searches
   all of them.
   Props: value, onChange(place), cities, placeholder, ariaLabel, className, flip
   (see SelectMenu). */
export default function CityMenu({ value, onChange, cities, placeholder = 'Ville ou aéroport', ariaLabel, className = '', flip = false }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)     // row the arrow keys are on
  const ref = useRef(null)
  const btnRef = useRef(null)
  const popRef = useRef(null)
  const inputRef = useRef(null)
  const scrollRef = useRef(null)
  const listId = useId()
  const up = useOpensUp(flip, open, ref, popRef)

  const groups = useMemo(() => {
    if (query.trim()) return [{ cities: searchCities(cities, query) }]
    const popular = popularCities(cities)
    const rest = cities.filter(c => !popular.includes(c))
    return [
      { label: 'Les plus demandés', cities: popular },
      { label: 'Aéroports', cities: rest.filter(isAirport) },
      { label: 'Villes', cities: rest.filter(c => !isAirport(c)) },
    ].filter(g => g.cities.length)
  }, [cities, query])
  const rows = groups.flatMap(g => g.cities)

  // Scrolls the list itself, never the page (scrollIntoView could move both).
  const reveal = (i, center = false) => {
    const box = scrollRef.current
    const row = box?.querySelector(`[data-row="${i}"]`)
    if (!row) return
    const top = row.offsetTop
    const bottom = top + row.offsetHeight
    if (center) box.scrollTop = (top + bottom - box.clientHeight) / 2
    else if (top < box.scrollTop) box.scrollTop = top
    else if (bottom > box.scrollTop + box.clientHeight) box.scrollTop = bottom - box.clientHeight
  }

  // Opens on the current city.
  useEffect(() => {
    if (!open) return
    const i = Math.max(0, rows.indexOf(value))
    setActive(i)
    reveal(i, true)
    if (i === 0 && scrollRef.current) scrollRef.current.scrollTop = 0
    // Focus the search on desktop only — on phones it would pop the keyboard
    // over the list before the visitor asked for it.
    if (window.matchMedia('(pointer: fine)').matches) inputRef.current?.focus({ preventScroll: true })
  }, [open])   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) close(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const close = (refocus = true) => {
    setOpen(false)
    setQuery('')
    if (refocus) btnRef.current?.focus({ preventScroll: true })
  }

  const pick = (city) => {
    if (!city) return
    onChange(city)
    close()
  }

  const onQuery = (q) => {
    setQuery(q)
    setActive(0)
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }

  const onKeyDown = (e) => {
    const step = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0
    if (!open) {
      if (step) { e.preventDefault(); setOpen(true) }
      return
    }
    if (step) {
      e.preventDefault()
      const next = Math.max(0, Math.min(rows.length - 1, active + step))
      setActive(next)
      reveal(next)
    } else if (e.key === 'Enter') {
      e.preventDefault()                // would submit the search form
      pick(rows[active])
    } else if (e.key === 'Escape') {
      e.stopPropagation()
      close()
    } else if (e.key === 'Tab') {
      close(false)
    }
  }

  let row = -1
  return (
    <div className={`smenu ${className}`} ref={ref} onKeyDown={onKeyDown}>
      <button
        type="button"
        ref={btnRef}
        className={`smenu__btn ${open ? 'open' : ''}`}
        onClick={() => (open ? close() : setOpen(true))}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel ? `${ariaLabel} : ${value || placeholder}` : undefined}
      >
        <span className={`smenu__value ${value ? '' : 'is-placeholder'}`}>{value || placeholder}</span>
        <svg className="smenu__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className={`smenu__list smenu__list--search${up ? ' smenu__list--up' : ''}`} ref={popRef}>
          <div className="smenu__search">
            <Icon name="search" />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={rows.length ? `${listId}-${active}` : undefined}
              aria-label="Rechercher une ville ou un aéroport"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="Ville, aéroport…"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <div className="smenu__scroll" role="listbox" id={listId} aria-label="Lieux" ref={scrollRef}>
            {groups.map(g => (
              <div key={g.label ?? 'results'} role="group" aria-label={g.label}>
                {g.label && <div className="smenu__group" aria-hidden="true">{g.label}</div>}
                {g.cities.map(city => {
                  row += 1
                  const i = row
                  return (
                    <button
                      type="button"
                      role="option"
                      key={city}
                      id={`${listId}-${i}`}
                      data-row={i}
                      tabIndex={-1}
                      aria-selected={value === city}
                      className={`smenu__item ${value === city ? 'active' : ''} ${i === active ? 'is-cursor' : ''}`}
                      // Move, not enter: scrolling by keyboard under a resting
                      // pointer must not steal the cursor.
                      onMouseMove={() => { if (i !== active) setActive(i) }}
                      onClick={() => pick(city)}
                    >
                      <Icon name={isAirport(city) ? 'plane' : 'pin'} className="smenu__place" />
                      <span className="smenu__name">
                        {city}
                        {placeHint(city) && <span className="smenu__hint">{placeHint(city)}</span>}
                      </span>
                      {value === city && (
                        <svg className="smenu__check" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
            {rows.length === 0 && (
              <p className="smenu__empty">Aucun lieu ne correspond à « {query.trim()} »</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
