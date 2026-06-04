import { useState, useEffect } from 'react'

// ── Tiny imperative dialog/toast system ──────────────────────────────────────
// Replaces native alert()/confirm() with styled, in-app popups. Any module can
// call showError / showInfo / confirmAsync; <DialogHost/> (mounted once) renders
// them. A module-level store + listeners keeps it usable outside React too.
let listeners = []
let state = { toasts: [], confirm: null }
const emit = () => { state = { ...state }; listeners.forEach(l => l(state)) }

function pushToast(message, type) {
  const id = Date.now() + Math.random()
  state.toasts = [...state.toasts, { id, message, type }]
  emit()
  setTimeout(() => dismissToast(id), 5000)
}
function dismissToast(id) {
  state.toasts = state.toasts.filter(t => t.id !== id)
  emit()
}

export const showError = (message) => pushToast(message, 'error')
export const showInfo  = (message) => pushToast(message, 'info')

// Promise<boolean> — resolves true if confirmed, false if cancelled/dismissed.
export function confirmAsync(message, opts = {}) {
  return new Promise(resolve => {
    state.confirm = {
      message,
      title: opts.title || 'Confirmation',
      confirmLabel: opts.confirmLabel || 'Confirmer',
      cancelLabel: opts.cancelLabel || 'Annuler',
      danger: opts.danger ?? false,
      resolve: (val) => { state.confirm = null; emit(); resolve(val) },
    }
    emit()
  })
}

export function DialogHost() {
  const [s, setS] = useState(state)
  useEffect(() => {
    listeners.push(setS)
    return () => { listeners = listeners.filter(l => l !== setS) }
  }, [])

  return (
    <>
      <div className="admin-toasts">
        {s.toasts.map(t => (
          <div key={t.id} className={`admin-toast admin-toast--${t.type}`}>
            <span className="admin-toast__icon">{t.type === 'error' ? '⚠' : 'ℹ'}</span>
            <span className="admin-toast__msg">{t.message}</span>
            <button className="admin-toast__close" onClick={() => dismissToast(t.id)} aria-label="Fermer">✕</button>
          </div>
        ))}
      </div>

      {s.confirm && (
        <div className="admin-modal admin-modal--conflict" onClick={() => s.confirm.resolve(false)}>
          <div className={`admin-conflict-popup ${s.confirm.danger ? 'admin-conflict-popup--danger' : ''}`} onClick={e => e.stopPropagation()}>
            <div className="admin-conflict-popup__head">
              <span className="admin-conflict-popup__icon">{s.confirm.danger ? '🗑' : '❓'}</span>
              <h3>{s.confirm.title}</h3>
              <button className="phone-modal__close" onClick={() => s.confirm.resolve(false)} aria-label="Fermer">✕</button>
            </div>
            <p className="admin-conflict-popup__desc">{s.confirm.message}</p>
            <div className="admin-conflict-popup__actions">
              <button className="admin-btn admin-btn--sm" onClick={() => s.confirm.resolve(false)}>{s.confirm.cancelLabel}</button>
              <button
                className={`admin-btn admin-btn--sm ${s.confirm.danger ? 'admin-btn--danger' : 'admin-btn--primary'}`}
                onClick={() => s.confirm.resolve(true)}
              >
                {s.confirm.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
