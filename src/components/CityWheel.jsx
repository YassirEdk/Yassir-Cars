import { useState, useRef, useEffect, useCallback, useMemo, useId } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon'
import { popularCities, searchCities } from '../lib/cities'
import './citywheel.css'

const ITEM_H = 46          // px height of each row

const clamp = (n, max) => Math.max(0, Math.min(max, n))

export default function CityWheel({ value, onChange, cities, placeholder = 'Ville ou aéroport…', error }) {
  const [open, setOpen] = useState(false)
  const [sel, setSel] = useState(0)
  const [query, setQuery] = useState('')
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const triggerRef = useRef(null)
  const snapT = useRef(null)
  const drag = useRef({ active: false, startY: 0, startTop: 0, moved: false })
  const titleId = useId()

  const list = useMemo(() => searchCities(cities, query), [query, cities])

  const popular = useMemo(() => popularCities(cities), [cities])

  // Center the wheel on the current value each time it opens, or on the place asked
  // for most: on the first of the list, half the wheel would be empty.
  useEffect(() => {
    if (!open) return
    const idx = Math.max(0, cities.indexOf(value || popular[0]))
    setSel(idx)
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = idx * ITEM_H
      // Focus the search on desktop only — on phones it would pop the keyboard
      // over the wheel before the visitor asked for it.
      if (window.matchMedia('(pointer: fine)').matches) inputRef.current?.focus({ preventScroll: true })
    })
  }, [open, value, cities, popular])

  // Lock background scroll while the wheel is open.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  const close = () => {
    setOpen(false)
    setQuery('')
    triggerRef.current?.focus({ preventScroll: true })
  }

  const choose = (city) => {
    if (!city) return
    onChange(city)
    close()
  }

  const settleTo = useCallback((i) => {
    const idx = clamp(i, list.length - 1)
    scrollRef.current?.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' })
    setSel(idx)
  }, [list.length])

  const onScroll = () => {
    if (!scrollRef.current) return
    const i = clamp(Math.round(scrollRef.current.scrollTop / ITEM_H), list.length - 1)
    setSel(i)
    clearTimeout(snapT.current)
    snapT.current = setTimeout(() => settleTo(Math.round(scrollRef.current.scrollTop / ITEM_H)), 90)
  }

  const onQuery = (q) => {
    setQuery(q)
    setSel(0)
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }

  // Keyboard: ↑/↓ move the wheel, Enter confirms, Escape closes. Read through a
  // ref so the listener always sees the current selection and filtered list.
  const onKey = useRef(null)
  onKey.current = (e) => {
    // stopPropagation: a parent modal (AvailabilityModal) also closes on Escape.
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close() }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      settleTo(sel + (e.key === 'ArrowDown' ? 1 : -1))
    } else if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') {
      e.preventDefault()
      choose(list[sel])
    }
  }
  useEffect(() => {
    if (!open) return
    const handler = (e) => onKey.current(e)
    // Capture on window so this runs before the parent modal's document listener.
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [open])

  // Pointer drag (desktop) — touch drag is handled natively by overflow scroll.
  const onPointerDown = (e) => {
    drag.current = { active: true, startY: e.clientY, startTop: scrollRef.current.scrollTop, moved: false }
  }
  const onPointerMove = (e) => {
    if (!drag.current.active) return
    const dy = e.clientY - drag.current.startY
    if (Math.abs(dy) > 3) drag.current.moved = true
    scrollRef.current.scrollTop = drag.current.startTop - dy
  }
  const endDrag = () => { drag.current.active = false }

  const current = list[sel]

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={`citywheel-field ${value ? '' : 'is-placeholder'} ${error ? 'input-error' : ''}`}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <span className="citywheel-field__txt">{value || placeholder}</span>
        <svg className="citywheel-field__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* Portalled to <body>: the booking card's backdrop-filter would otherwise
          become the containing block of this position:fixed overlay. */}
      {open && createPortal(
        <div
          className="citywheel-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) close() }}
        >
          <div className="citywheel-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <div className="citywheel-sheet__head">
              <h3 id={titleId}><Icon name="pin" /> Choisissez un lieu</h3>
              <button type="button" className="citywheel-sheet__close" onClick={close} aria-label="Fermer">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
                  strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="citywheel-search">
              <Icon name="search" className="citywheel-search__icon" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => onQuery(e.target.value)}
                placeholder="Ville, aéroport…"
                aria-label="Rechercher une ville ou un aéroport"
                autoComplete="off"
                spellCheck={false}
              />
              {query && (
                <button type="button" className="citywheel-search__clear" onClick={() => { onQuery(''); inputRef.current?.focus() }} aria-label="Effacer">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor"
                    strokeWidth="3" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              )}
            </div>

            {!query && popular.length > 0 && (
              <div className="citywheel-chips">
                {popular.map(c => (
                  <button
                    type="button"
                    key={c}
                    className={`citywheel-chip ${c === value ? 'active' : ''}`}
                    onClick={() => choose(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            {list.length === 0 ? (
              <div className="citywheel-empty">
                <Icon name="search" />
                <p>Aucun lieu ne correspond à « {query.trim()} »</p>
              </div>
            ) : (
              <div className="citywheel">
                <div className="citywheel__band" />
                <div
                  className="citywheel__scroll"
                  ref={scrollRef}
                  onScroll={onScroll}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={endDrag}
                  onPointerLeave={endDrag}
                >
                  <div className="citywheel__pad" />
                  {list.map((c, i) => (
                    <button
                      type="button"
                      key={c}
                      className={`citywheel__item ${i === sel ? 'active' : ''}`}
                      style={{ '--d': Math.min(Math.abs(i - sel), 3) }}
                      // A click on the centred city picks it; elsewhere it scrolls there.
                      onClick={() => { if (!drag.current.moved) (i === sel ? choose(c) : settleTo(i)) }}
                    >
                      {c}
                    </button>
                  ))}
                  <div className="citywheel__pad" />
                </div>
              </div>
            )}

            <button type="button" className="citywheel-confirm" onClick={() => choose(current)} disabled={!current}>
              {current ? <>Choisir <strong>{current}</strong></> : 'Aucun lieu'}
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
