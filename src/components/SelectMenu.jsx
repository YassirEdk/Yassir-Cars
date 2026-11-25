import { useState, useRef, useEffect } from 'react'
import { useOpensUp } from '../hooks/useOpensUp'
import './selectmenu.css'

/* Styled dropdown — simple click to open & pick. Replaces native <select>.
   Props: value, onChange(value), options [{ value, label }], ariaLabel,
   flip (open above the button when the list doesn't fit below). */
export default function SelectMenu({ value, onChange, options, ariaLabel, className = '', flip = false }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const listRef = useRef(null)
  const up = useOpensUp(flip, open, ref, listRef)
  const current = options.find(o => o.value === value)

  const btnRef = useRef(null)
  // Opened with the keyboard: focus moves to the current option.
  const focusList = useRef(false)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    if (!open || !focusList.current) return
    focusList.current = false
    const items = [...listRef.current.querySelectorAll('[role="option"]')]
    const at = items.find(el => el.getAttribute('aria-selected') === 'true') ?? items[0]
    at?.focus({ preventScroll: true })
  }, [open])

  const close = () => {
    setOpen(false)
    btnRef.current?.focus({ preventScroll: true })
  }
  const pick = (v) => { onChange(v); close() }

  const onKeyDown = (e) => {
    const step = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0
    if (!open) {
      if (step) { e.preventDefault(); focusList.current = true; setOpen(true) }
      return
    }
    if (e.key === 'Escape') { e.stopPropagation(); return close() }
    if (e.key === 'Tab') return setOpen(false)
    const items = [...listRef.current.querySelectorAll('[role="option"]')]
    const at = items.indexOf(document.activeElement)
    const to = e.key === 'Home' ? 0
      : e.key === 'End' ? items.length - 1
        : step ? Math.max(0, Math.min(items.length - 1, at + step)) : -1
    if (to < 0) return
    e.preventDefault()
    items[to].focus()
  }

  return (
    <div className={`smenu ${className}`} ref={ref} onKeyDown={onKeyDown}>
      <button
        type="button"
        ref={btnRef}
        className={`smenu__btn ${open ? 'open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel ? `${ariaLabel} : ${current?.label ?? ''}` : undefined}
      >
        <span className="smenu__value">{current?.label ?? ''}</span>
        <svg className="smenu__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul className={`smenu__list${up ? ' smenu__list--up' : ''}`} role="listbox" aria-label={ariaLabel} ref={listRef}>
          {options.map(o => (
            <li key={o.value} role="presentation">
              <button
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={value === o.value}
                className={`smenu__item ${value === o.value ? 'active' : ''}`}
                onClick={() => pick(o.value)}
              >
                <span className="smenu__name">{o.label}</span>
                {value === o.value && (
                  <svg className="smenu__check" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
