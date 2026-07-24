/* Scroll snapshots that survive a page that is still loading.

   A plain `scrollY` is not enough: the home page grows for a second or two
   after mount (cars are fetched, photos decode, sections reveal), so restoring
   "2259px" right after a back-navigation lands wherever the page happens to
   end at that instant — usually far too high. A snapshot therefore records the
   nearest section ABOVE the fold plus the distance to it; that anchor keeps its
   meaning however much the page grows, and the offset is re-applied until the
   layout settles. */

export const NAV_GAP = 76        // fallback when the navbar isn't measurable

/* Height of whatever fixed bar sits at the top of the current page. Measured,
   not hardcoded: the navbar shrinks from 16px to 10px padding once scrolled. */
export function topBarHeight() {
  const bar = document.querySelector('.navbar') || document.querySelector('.results-nav')
  return bar ? Math.round(bar.getBoundingClientRect().height) : NAV_GAP
}

/* Scroll a section so it sits flush under the fixed navbar.

   Hand-animated rather than `behavior: 'smooth'` + corrections. The page grows
   while the scroll runs (photos decode, sections reveal, the navbar shrinks),
   so the destination moves; the browser animates to a fixed number and lands
   short, and patching that up afterwards is a visible jump. Here the target is
   recomputed every frame and eased into, so the drift is absorbed while moving
   and the landing is always smooth.

   The offset comes from the element's own `scroll-margin-top`, so it stays a
   CSS decision. Any input from the visitor cancels the animation. */
const EASE_MS = 620
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)

let activeScroll = 0

export function scrollToSection(id, { smooth = true } = {}) {
  const el = document.getElementById(id)
  if (!el) return false

  const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0
  const targetNow = () =>
    Math.max(0, Math.min(
      el.getBoundingClientRect().top + window.scrollY - margin,
      document.documentElement.scrollHeight - window.innerHeight,
    ))

  if (activeScroll) cancelAnimationFrame(activeScroll)

  if (!smooth) {
    window.scrollTo(0, targetNow())
    return true
  }

  const from = window.scrollY
  const started = performance.now()

  const stop = () => {
    if (activeScroll) cancelAnimationFrame(activeScroll)
    activeScroll = 0
    detach()
  }
  const detach = () => {
    window.removeEventListener('wheel', stop)
    window.removeEventListener('touchstart', stop)
    window.removeEventListener('keydown', stop)
  }
  window.addEventListener('wheel', stop, { passive: true })
  window.addEventListener('touchstart', stop, { passive: true })
  window.addEventListener('keydown', stop)

  const step = (now) => {
    const t = Math.min(1, (now - started) / EASE_MS)
    const to = targetNow()                       // recomputed: absorbs any drift
    window.scrollTo(0, Math.round(from + (to - from) * easeOutCubic(t)))
    if (t < 1) {
      activeScroll = requestAnimationFrame(step)
    } else {
      activeScroll = 0
      detach()
    }
  }
  activeScroll = requestAnimationFrame(step)
  return true
}

export function takeSnapshot() {
  const y = window.scrollY
  let anchor = null
  for (const el of document.querySelectorAll('section[id], [data-scroll-anchor]')) {
    const top = el.getBoundingClientRect().top + y
    if (top <= y + 4 && (!anchor || top > anchor.top)) anchor = { id: el.id, top }
  }
  return anchor ? { y, id: anchor.id, offset: y - anchor.top } : { y }
}

export function readStored(pathname) {
  try {
    const raw = sessionStorage.getItem(`yc_scroll:${pathname}`)
    const snap = raw ? JSON.parse(raw) : null
    return snap && (snap.y > 0 || snap.id) ? snap : null
  } catch {
    return null
  }
}

// Where this snapshot points to, right now. Null while its anchor is missing.
function targetOf(snap) {
  if (snap.id) {
    const el = document.getElementById(snap.id)
    if (!el) return null
    // offset null → align the section under the navbar, the same place a nav
    // link would put it (scroll-margin-top does that work).
    const margin = snap.offset == null
      ? -parseFloat(getComputedStyle(el).scrollMarginTop || '0')
      : snap.offset
    return Math.max(0, el.getBoundingClientRect().top + window.scrollY + margin)
  }
  return Math.max(0, snap.y ?? 0)
}

/* Applies a snapshot and keeps applying it while the page settles: every frame
   the target is recomputed from the anchor, so content loading above the fold
   can't push the reader off the section they left. Stops once the target has
   been hit and hasn't moved for a few frames, or after `budget` ms.
   Returns a cleanup function. */
export function restoreScroll(snap, budget = 4000) {
  let frame = 0
  let stable = 0
  let lastTarget = -1
  const until = performance.now() + budget

  const step = () => {
    const target = targetOf(snap)
    if (target == null) {                     // anchor not in the DOM yet
      frame = performance.now() < until ? requestAnimationFrame(step) : 0
      return
    }
    if (Math.round(window.scrollY) !== Math.round(target)) window.scrollTo(0, target)
    stable = (Math.round(target) === lastTarget && Math.abs(window.scrollY - target) <= 2)
      ? stable + 1
      : 0
    lastTarget = Math.round(target)
    // ~10 quiet frames means the layout stopped moving under us.
    frame = (stable < 10 && performance.now() < until) ? requestAnimationFrame(step) : 0
  }

  frame = requestAnimationFrame(step)
  return () => { if (frame) cancelAnimationFrame(frame) }
}
