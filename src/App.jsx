import { Routes, Route, useLocation, useNavigationType } from 'react-router-dom'
import { useEffect, useLayoutEffect, useRef, Suspense } from 'react'
import { recordVisit } from './lib/history'
import { takeSnapshot, readStored, restoreScroll, jumpTo, scrollToSection, topBarHeight } from './lib/scroll'
import { SearchResults, AllCars, Reserver, Admin, ErrorPage, searchKey } from './routes'
import Home from './pages/Home'

// A new search is a new results page (routes.js).
function Results() {
  return <SearchResults key={searchKey(useLocation().search)} />
}

const Loading = () => (
  <div style={{ minHeight: '100vh', background: 'var(--page)' }} aria-busy="true" />
)

export default function App() {
  // Intercept all hash-anchor clicks so the URL never shows #section
  useEffect(() => {
    const handler = (e) => {
      const a = e.target.closest('a[href^="#"]')
      if (!a) return
      e.preventDefault()
      const id = a.getAttribute('href').slice(1)
      if (!id) return
      scrollToSection(id)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const location = useLocation()
  const navType = useNavigationType()
  // One snapshot per history entry, so going back lands where you left.
  const positions = useRef(new Map())

  useEffect(() => { recordVisit(location.pathname) }, [location.pathname])

  useEffect(() => {
    // Ours only — the browser's own restoration fights it otherwise.
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'
  }, [])

  /* Remember where this entry was left, while it is on screen.

     The snapshot is taken DURING scrolling, never in the cleanup: by the time
     an unmount effect runs, React has already removed the old page's DOM, the
     document is short, and the browser has clamped window.scrollY to that
     short page — which is how "2259" turned into "465" and dropped the visitor
     near the top of the page on the way back.

     A layout effect, so it has moved on to the new entry before that one is
     scrolled into place. */
  const lastSnap = useRef(null)
  useLayoutEffect(() => {
    const key = location.key
    const path = location.pathname
    let frame = 0

    const persist = (snap) => {
      if (!snap) return
      lastSnap.current = snap
      positions.current.set(key, snap)
      try { sessionStorage.setItem(`yc_scroll:${path}`, JSON.stringify(snap)) } catch { /* blocked */ }
    }

    const onScroll = () => {
      // Cheap synchronous value first, enriched with its section anchor next
      // frame — so nothing is lost if the visitor leaves mid-gesture.
      lastSnap.current = { y: window.scrollY }
      if (frame) return
      frame = requestAnimationFrame(() => { frame = 0; persist(takeSnapshot()) })
    }

    // A filter change is the same page at the same spot.
    if (!location.state?.keepScroll) lastSnap.current = null
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
      persist(lastSnap.current)      // last value seen while the page was up
    }
  }, [location.key, location.pathname])   // eslint-disable-line react-hooks/exhaustive-deps

  /* Restore. A new page starts at the top; coming back returns to the spot the
     visitor left. Once before the first paint, then for as long as the page is
     still settling. */
  const stays = location.state?.keepScroll && navType !== 'POP'
  const landing = () => {
    const id = location.state?.scrollToId
    return id
      ? { id, offset: null }                    // "Retour à l'accueil" → that section
      : navType === 'POP'
        ? positions.current.get(location.key)
        : location.state?.restoreScroll
          ? readStored(location.pathname)
          : null
  }
  const landingRef = useRef(null)
  useLayoutEffect(() => {
    if (stays) return
    landingRef.current = landing()
    jumpTo(landingRef.current)
  }, [location.key, location.state, navType])   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (stays) return
    if (!landingRef.current) { window.scrollTo(0, 0); return }
    return restoreScroll(landingRef.current)
  }, [location.key, location.state, navType])   // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/resultats" element={<Results />} />
        <Route path="/flotte" element={<AllCars />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/reserver" element={<Reserver />} />
        <Route path="/403" element={<ErrorPage code={403} />} />
        <Route path="/405" element={<ErrorPage code={405} />} />
        <Route path="/404" element={<ErrorPage code={404} />} />
        <Route path="*" element={<ErrorPage code={404} />} />
      </Routes>
    </Suspense>
  )
}
