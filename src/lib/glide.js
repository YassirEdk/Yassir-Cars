import { flushSync } from 'react-dom'

/* Applies a change so that the cards on screen glide to their new places, where the
   browser knows how (Chrome, Safari). Elsewhere, and for visitors who asked for
   less motion, it just applies it. The cards are matched by `view-transition-name`. */
export function glide(apply) {
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (calm || !document.startViewTransition) return apply()
  document.startViewTransition(() => flushSync(apply))
}
