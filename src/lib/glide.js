import { flushSync } from 'react-dom'

/* Applies a change so that the cards on screen glide to their new places, where the
   browser knows how (Chrome, Safari). Elsewhere, and for visitors who asked for
   less motion, it just applies it. The cards are matched by `view-transition-name`. */
let gliding = false

/* True while a glide applies its change: a change that goes through the URL (the
   filters of the results) must then reach the page at once, not later in a
   transition, or the browser would take its picture of the page before it moved.
   TransitionRouter asks. */
export const isGliding = () => gliding

export function glide(apply) {
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (calm || !document.startViewTransition) return apply()
  document.startViewTransition(() => flushSync(() => {
    gliding = true
    try { apply() } finally { gliding = false }
  }))
}
