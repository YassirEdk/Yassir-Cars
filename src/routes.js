import { lazy } from 'react'

/* React.lazy, plus `ready()`: fetches a page's code before the page is shown.

   Once the code is in, the page renders in the same pass instead of suspending
   one more time (lazy is handed a thenable that answers at once). That is what
   lets a page transition capture the finished page rather than a blank one. */
function page(load) {
  let mod = null
  let pending = null

  const fetchIt = () => {
    if (!pending) {
      pending = load().then(
        (m) => (mod = m),
        (err) => { pending = null; throw err },
      )
    }
    return pending
  }

  const Page = lazy(() => (mod ? { then: (done) => done(mod) } : fetchIt()))
  // Null when the code is in already, else the download to wait for.
  Page.ready = () => (mod ? null : fetchIt())
  return Page
}

/* Only the home page ships in the first bundle — it is what almost every visit
   starts with. The other routes are fetched when they are actually opened, so
   a first visit downloads a fraction of the JavaScript. (Admin also drags in
   Recharts, which no public visitor should ever pay for.) */
export const SearchResults = page(() => import('./pages/SearchResults'))
export const AllCars = page(() => import('./pages/AllCars'))
export const Reserver = page(() => import('./pages/Reserver'))
export const Admin = page(() => import('./pages/Admin'))
export const ErrorPage = page(() => import('./pages/ErrorPage'))

const ON_DEMAND = {
  '/resultats': SearchResults,
  '/flotte': AllCars,
  '/reserver': Reserver,
  '/admin': Admin,
}

// Routes match whatever the case and a trailing slash.
export const pathOf = ({ pathname }) => pathname.toLowerCase().replace(/\/+$/, '') || '/'

/* Fetches the code a location needs. Null when there is nothing to wait for. */
export function prepareRoute(location) {
  const path = pathOf(location)
  if (path === '/') return null
  return (ON_DEMAND[path] ?? ErrorPage).ready()
}

/* A new place or new dates start the results page afresh. Its filters are in the
   URL too, but changing one must not reload the page under the visitor. */
export function searchKey(search) {
  const params = new URLSearchParams(search)
  return ['lieu', 'depart', 'retour', 'car'].map(k => params.get(k) ?? '').join('|')
}

/* The page a location shows: going from one to another is a page turn. */
export function pageOf(location) {
  const path = pathOf(location)
  return path === '/resultats' ? `${path}?${searchKey(location.search)}` : path
}
