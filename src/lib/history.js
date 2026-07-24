/* Where the visitor came from, within this site.

   Kept here rather than in router state so any component can ask the question
   without threading a prop through. App.jsx records every navigation. */

let previous = null
let current = null

export function recordVisit(pathname) {
  if (pathname === current) return
  previous = current
  current = pathname
}

/* True when the last page the visitor was on is `path` AND there is a history
   entry to step back to — the two conditions for `navigate(-1)` to land where
   the label promises. */
export function cameFrom(path) {
  if (previous !== path) return false
  return (window.history.state?.idx ?? 0) > 0
}
