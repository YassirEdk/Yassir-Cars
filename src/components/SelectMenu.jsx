import { useState, useRef, useEffect } from 'react'
import './selectmenu.css'

/* Styled dropdown — simple click to open & pick. Replaces native <select>.
   Props: value, onChange(value), options [{ value, label }], ariaLabel. */
export default function SelectMenu({ value, onChange, options, ariaLabel, className = '' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const current = options.find(o => o.value === value)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const pick = (v) => { onChange(v); setOpen(false) }

  return (
    <div className={`smenu ${className}`} ref={ref}>
      <button
        type="button"
        className={`smenu__btn ${open ? 'open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className="smenu__value">{current?.label ?? ''}</span>
        <svg className="smenu__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul className="smenu__list" role="listbox">
          {options.map(o => (
            <li key={o.value}>
              <button
                type="button"
                role="option"
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
