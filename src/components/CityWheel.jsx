import { useState, useRef, useEffect, useCallback } from 'react'
import './citywheel.css'

const ITEM_H = 46          // px height of each row
const VISIBLE = 5          // odd number of visible rows

const clamp = (n, max) => Math.max(0, Math.min(max, n))

export default function CityWheel({ value, onChange, cities, placeholder = 'Choisissez une ville…', error }) {
  const [open, setOpen] = useState(false)
  const [sel, setSel] = useState(0)
  const scrollRef = useRef(null)
  const snapT = useRef(null)
  const drag = useRef({ active: false, startY: 0, startTop: 0, moved: false })

  // Center the wheel on the current value each time it opens.
  useEffect(() => {
    if (!open) return
    const idx = Math.max(0, cities.indexOf(value))
    setSel(idx)
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = idx * ITEM_H
    })
  }, [open, value, cities])

  // Lock background scroll while the wheel is open.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  const settleTo = useCallback((i) => {
    const idx = clamp(i, cities.length - 1)
    scrollRef.current?.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' })
    setSel(idx)
  }, [cities.length])

  const onScroll = () => {
    if (!scrollRef.current) return
    const i = clamp(Math.round(scrollRef.current.scrollTop / ITEM_H), cities.length - 1)
    setSel(i)
    clearTimeout(snapT.current)
    snapT.current = setTimeout(() => settleTo(Math.round(scrollRef.current.scrollTop / ITEM_H)), 90)
  }

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

  const confirm = () => { onChange(cities[sel]); setOpen(false) }

  return (
    <>
      <button
        type="button"
        className={`citywheel-field ${value ? '' : 'is-placeholder'} ${error ? 'input-error' : ''}`}
        onClick={() => setOpen(true)}
      >
        <span className="citywheel-field__txt">{value || placeholder}</span>
        <svg className="citywheel-field__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          className="citywheel-overlay"
          onClick={(e) => { if (e.target.classList.contains('citywheel-overlay')) setOpen(false) }}
        >
          <div className="citywheel-sheet">
            <div className="citywheel-sheet__head">
              <h3>📍 Choisissez une ville</h3>
              <button type="button" className="citywheel-sheet__close" onClick={() => setOpen(false)} aria-label="Fermer">✕</button>
            </div>

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
                {cities.map((c, i) => {
                  const dist = Math.abs(i - sel)
                  return (
                    <button
                      type="button"
                      key={c}
                      className={`citywheel__item ${i === sel ? 'active' : ''}`}
                      style={{ '--d': Math.min(dist, 3) }}
                      onClick={() => { if (!drag.current.moved) settleTo(i) }}
                    >
                      {c}
                    </button>
                  )
                })}
                <div className="citywheel__pad" />
              </div>
            </div>

            <button type="button" className="citywheel-confirm" onClick={confirm}>
              Confirmer
            </button>
          </div>
        </div>
      )}
    </>
  )
}
