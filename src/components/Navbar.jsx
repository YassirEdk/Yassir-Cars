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

  // Lock page scroll while the mobile menu overlay is open. On mobile,
  // `overflow:hidden` alone doesn't stop touch-dragging, so we pin the body
  // with `position:fixed` (and restore the scroll position on close).
  useEffect(() => {
    if (!menuOpen) return
    const scrollY = window.scrollY
    const { body } = document
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
    return () => {
      body.style.position = ''
      body.style.top = ''
      body.style.left = ''
      body.style.right = ''
      body.style.width = ''
      window.scrollTo(0, scrollY)
    }
  }, [menuOpen])

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
        </ul>

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
