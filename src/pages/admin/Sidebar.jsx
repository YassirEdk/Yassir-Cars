import { Link } from 'react-router-dom'
import Logo from '../../components/Logo'
import { Ico } from './Icons'

// Primary navigation. The per-car detail view ('car') lights up "Voitures".
const NAV = [
  { key: 'overview',     label: 'Tableau de bord', icon: 'grid' },
  { key: 'cars',         label: 'Voitures',        icon: 'car' },
  { key: 'reservations', label: 'Réservations',    icon: 'calendar' },
]

/* ── Fixed left navigation (off-canvas drawer on mobile) ──────────────────── */
export default function Sidebar({ view, onNavigate, onOpenSettings, onLogout, open, onClose }) {
  const activeKey = view === 'car' ? 'cars' : view
  return (
    <>
      <div className={`admin-sidebar__scrim${open ? ' is-open' : ''}`} onClick={onClose} aria-hidden />
      <aside className={`admin-sidebar${open ? ' is-open' : ''}`}>
        <div className="admin-sidebar__brand">
          <Logo size={38} animated={false} />
          <span className="admin-sidebar__badge">Admin</span>
        </div>

        <nav className="admin-sidebar__nav">
          <p className="admin-sidebar__section">Pilotage</p>
          {NAV.map(item => (
            <button
              key={item.key}
              className={`admin-nav-item${activeKey === item.key ? ' is-active' : ''}`}
              onClick={() => { onNavigate(item.key); onClose() }}
            >
              <Ico name={item.icon} /><span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="admin-sidebar__foot">
          <Link to="/" className="admin-nav-item admin-nav-item--sub"><Ico name="globe" /><span>Voir le site</span></Link>
          <button className="admin-nav-item admin-nav-item--sub" onClick={() => { onOpenSettings(); onClose() }}>
            <Ico name="settings" /><span>Réglages</span>
          </button>
          <button className="admin-nav-item admin-nav-item--danger" onClick={onLogout}>
            <Ico name="logout" /><span>Déconnexion</span>
          </button>
        </div>
      </aside>
    </>
  )
}
