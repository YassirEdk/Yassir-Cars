import { useEffect, useRef } from 'react'

const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'

/* What a popup owes the keyboard: focus goes in, Tab stays in, Escape closes it, and
   focus goes back where it was. The page behind holds still meanwhile. Put the ref on
   the panel, with `tabIndex={-1}`. */
export function useDialog(onClose) {
  const ref = useRef(null)
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    const panel = ref.current
    const opener = document.activeElement
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    panel.focus({ preventScroll: true })

    const onKey = (e) => {
      if (e.key === 'Escape') return close.current()
      // A list opened over the popup has the focus: not ours to hold.
      if (e.key !== 'Tab' || !panel.contains(document.activeElement)) return
      const items = [...panel.querySelectorAll(FOCUSABLE)].filter(el => el.offsetParent)
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      const at = document.activeElement
      if (e.shiftKey && (at === first || at === panel)) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && at === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      opener?.focus?.({ preventScroll: true })
    }
  }, [])

  return ref
}
