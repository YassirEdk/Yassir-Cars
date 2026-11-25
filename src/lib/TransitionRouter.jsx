import { startTransition, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Router, UNSAFE_createBrowserHistory as createBrowserHistory } from 'react-router-dom'
import { pageOf, pathOf, prepareRoute } from '../routes'

/* BrowserRouter, plus a transition when the visitor goes from one page to another.

   The page being left stays up, live, until the next one's code is in. Then the
   browser snapshots it, React swaps the pages in one synchronous pass (App's
   scroll restore included, so the new page is captured where it will stand),
   and CSS animates one into the other: index.css, "Page to page". Changes within
   a page (filters, sorting) are not page turns and apply as before.

   Going back plays it the other way round: a history step back, or a link to the
   page the visitor just came from (the "Retour" buttons push a new entry).

   No animation for visitors who asked for less motion, nor after a back/forward
   swipe the browser has animated itself: a second one would replay the page
   being left. Browsers without view transitions fade the new page in. */

const EDGE = 24          // px from the side of the screen where a swipe back starts
const SWIPE_MS = 4000    // how long that touch may take to turn into a navigation

const calm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const entryIndex = () => window.history.state?.idx

export default function TransitionRouter({ children }) {
  const historyRef = useRef(null)
  if (!historyRef.current) historyRef.current = createBrowserHistory({ v5Compat: true })
  const history = historyRef.current

  const [state, setState] = useState(() => ({ action: history.action, location: history.location }))
  // What is on screen. A navigation is a page turn against this, not against the
  // last history entry, which may still be waiting for its code.
  const shown = useRef(state.location)
  const fadeIn = useRef(false)

  useLayoutEffect(() => {
    const root = document.documentElement
    let ticket = 0
    let running = null
    let edgeTouch = -Infinity
    let swiped = false
    // The path at each history entry of this visit: where "back" leads.
    const trail = []
    trail[entryIndex() ?? 0] = pathOf(shown.current)

    const onTouch = (e) => {
      const x = e.touches[0]?.clientX
      edgeTouch = x < EDGE || x > window.innerWidth - EDGE ? performance.now() : -Infinity
    }
    // Registered before the history's own listener, and capturing: runs first.
    const onPop = (e) => {
      swiped = Boolean(e.hasUAVisualTransition) || performance.now() - edgeTouch < SWIPE_MS
    }
    window.addEventListener('touchstart', onTouch, { capture: true, passive: true })
    window.addEventListener('popstate', onPop, true)

    // As BrowserRouter does it: the old page stays until the new one can render.
    const plain = (next) => {
      shown.current = next.location
      startTransition(() => setState(next))
    }

    const turn = (next, back) => {
      shown.current = next.location
      if (!document.startViewTransition) {
        fadeIn.current = true
        startTransition(() => setState(next))
        return
      }
      root.classList.add('vt-page')
      root.classList.toggle('vt-back', back)
      let vt
      try {
        vt = document.startViewTransition(() => flushSync(() => setState(next)))
      } catch {
        root.classList.remove('vt-page', 'vt-back')
        startTransition(() => setState(next))
        return
      }
      running = vt
      vt.ready.catch(() => {})          // skipped: the pages still swap, unanimated
      const end = () => {
        if (running !== vt) return
        running = null
        root.classList.remove('vt-page', 'vt-back')
      }
      vt.finished.then(end, end)
    }

    const unlisten = history.listen(({ action, location, delta }) => {
      const id = ++ticket
      const next = { action, location }
      const byBrowser = swiped
      swiped = false

      const idx = entryIndex()
      const back = action === 'POP'
        ? !(delta > 0)
        : idx != null && trail[idx - (action === 'PUSH' ? 2 : 1)] === pathOf(location)
      if (idx != null) {
        if (action === 'PUSH') trail.length = idx     // the entries ahead are gone
        trail[idx] = pathOf(location)
      }

      if (byBrowser || calm() || pageOf(location) === pageOf(shown.current)) return plain(next)

      const loading = prepareRoute(location)
      if (!loading) return turn(next, back)
      loading.then(
        () => { if (id === ticket) turn(next, back) },
        () => { if (id === ticket) plain(next) },
      )
    })

    return () => {
      unlisten()
      window.removeEventListener('touchstart', onTouch, { capture: true })
      window.removeEventListener('popstate', onPop, true)
      root.classList.remove('vt-page', 'vt-back')
    }
  }, [history])

  // Without view transitions: the new page fades in. Opacity only — a transform
  // here would carry the fixed navbar along with the page.
  useLayoutEffect(() => {
    if (!fadeIn.current) return
    fadeIn.current = false
    document.body.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 320, easing: 'cubic-bezier(.2,.75,.25,1)' })
  }, [state])

  return (
    <Router location={state.location} navigationType={state.action} navigator={history}>
      {children}
    </Router>
  )
}
