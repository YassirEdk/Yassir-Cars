import { useState, useEffect } from 'react'
import Logo from './Logo'

const links = [
  { href: '#accueil', label: 'Accueil' },
  { href: '#services', label: 'Services' },
  { href: '#flotte', label: 'Notre Flotte' },
  { href: '#comment', label: 'Comment ça marche' },
  { href: '#avis', label: 'Avis' },
  { href: '#contact', label: 'Contact' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="container nav-inner">
        <a href="#accueil" style={{ textDecoration: 'none' }}>
          <Logo size={38} animated />
        </a>

        <ul className={`nav-links ${menuOpen ? 'open' : ''}`}>
          {menuOpen && (
            <button className="menu-close" onClick={() => setMenuOpen(false)} aria-label="Fermer">✕</button>
          )}
          {links.map(l => (
            <li key={l.href}>
              <a href={l.href} onClick={() => setMenuOpen(false)}>{l.label}</a>
            </li>
          ))}
          {menuOpen && (
            <li>
              <a href="#reserver" className="btn btn-primary" onClick={() => setMenuOpen(false)}>
                Réserver maintenant
              </a>
            </li>
          )}
        </ul>

        <a href="#reserver" className="btn btn-primary nav-cta">Réserver maintenant</a>

        <button
          className={`hamburger ${menuOpen ? 'active' : ''}`}
          onClick={() => setMenuOpen(v => !v)}
          aria-label="Menu"
        >
          <span /><span /><span />
        </button>
      </div>
    </nav>
  )
}
