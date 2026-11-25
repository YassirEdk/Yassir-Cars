import { useLayoutEffect, useState } from 'react'
import { topBarHeight } from '../lib/scroll'

/* Should this popup open above its field? True when it doesn't fit below and
   there is more room above (between the navbar and the field). Measured each
   time it opens, before paint, so it never flashes on the wrong side. */
export function useOpensUp(enabled, open, fieldRef, popupRef) {
  const [up, setUp] = useState(false)

  useLayoutEffect(() => {
    if (!enabled || !open || !fieldRef.current || !popupRef.current) return
    const field = fieldRef.current.getBoundingClientRect()
    const need = popupRef.current.offsetHeight + 16
    const below = window.innerHeight - field.bottom
    const above = field.top - topBarHeight()
    setUp(below < need && above > below)
  }, [enabled, open, fieldRef, popupRef])

  return up
}
