import { Link, useNavigate } from 'react-router-dom'
import { cameFrom } from '../lib/history'

/* "Retour à l'accueil" and friends.

   A plain <Link to="/"> pushes a NEW history entry, so the home page rebuilt
   from scratch at the top — the visitor lost the section they were reading.
   Three strategies, most reliable first:

   1. `anchor` — the section the visitor came from (carried in router state by
      the link that brought them here). Scrolling to an element is immune to
      the page still growing while cars load, so this is the safe path.
   2. the previous history entry IS `to` → step back, restoring its position.
   3. otherwise push, asking App to restore the last position of that page. */
export default function BackLink({ to = '/', anchor = null, className, children }) {
  const navigate = useNavigate()

  const onClick = (e) => {
    e.preventDefault()
    if (anchor) return navigate(to, { state: { scrollToId: anchor } })
    if (cameFrom(to)) return navigate(-1)
    navigate(to, { state: { restoreScroll: true } })
  }

  return <Link to={to} className={className} onClick={onClick}>{children}</Link>
}

/* The header button of the results and fleet pages. On phones it shortens to
   "Retour" so the row fits beside the logo. */
export function BackHome({ anchor = null }) {
  return (
    <BackLink to="/" anchor={anchor} className="back-btn">
      <span className="back-btn__arrow" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
          strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" focusable="false">
          <path d="M19 12H5M11 6l-6 6 6 6" />
        </svg>
      </span>
      <span>Retour<span className="back-btn__long"> à l'accueil</span></span>
    </BackLink>
  )
}
