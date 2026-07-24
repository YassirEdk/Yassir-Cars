import { useState, useEffect, useRef } from 'react'
import { scrollToSection } from '../lib/scroll'
import { Link } from 'react-router-dom'
import Logo from './Logo'
import Icon from './Icon'
import SocialIcon from './SocialIcon'
import { useSettings } from '../lib/SettingsContext'
import { formatPhone, waLink } from '../lib/contact'

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
  const [active, setActive] = useState('#accueil')
  // Section to jump to once the drawer has closed and the scroll lock released.
  const pendingHash = useRef(null)
  const { settings } = useSettings()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Highlight the section currently under the middle of the viewport, so the
  // header shows where you are on a long single-page site.
  useEffect(() => {
    const sections = links
      .map(l => document.getElementById(l.href.slice(1)))
      .filter(Boolean)
    if (!sections.length) return

    const obs = new IntersectionObserver(
      entries => {
        for (const e of entries) if (e.isIntersecting) setActive(`#${e.target.id}`)
      },
      // A thin band across the middle of the screen: a section becomes "active"
      // once it occupies the centre, not merely when it peeks into view.
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
    )
    sections.forEach(s => obs.observe(s))
    return () => obs.disconnect()
  }, [])

  // Close the drawer with Escape.
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

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
      // Tapping a link closes the drawer, and the restore above would snap the
      // page straight back to where the menu was opened — cancelling the jump
      // to the section. So the scroll happens here, after the unlock.
      const target = pendingHash.current
      pendingHash.current = null
      if (target) {
        requestAnimationFrame(() => {
          scrollToSection(target.slice(1))
        })
      }
    }
  }, [menuOpen])

  const close = () => setMenuOpen(false)

  // Own the anchor scroll rather than letting the global handler in App.jsx run
  // it while the body is still pinned by the scroll lock.
  const goTo = (href) => (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (menuOpen) {
      pendingHash.current = href
      setMenuOpen(false)
    } else {
      scrollToSection(href.slice(1))
    }
  }
  const wa = settings.whatsapp
    ? waLink(settings.whatsapp, 'Bonjour YASSIR CARS, je souhaite des informations.')
    : null

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="container nav-inner">
        <a href="#accueil" className="nav-brand" onClick={goTo('#accueil')}>
          <Logo size={38} animated />
        </a>

        <ul className={`nav-links ${menuOpen ? 'open' : ''}`}>
          {/* Drawer-only header: without it the open menu is six links adrift
              in a black rectangle, with no branding and no way back. */}
          <li className="nav-drawer__top" aria-hidden={!menuOpen}>
            <Logo size={34} animated={false} />
            <button className="menu-close" onClick={close} aria-label="Fermer le menu">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" width="22" height="22"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </li>

          {links.map(l => (
            <li key={l.href}>
              <a
                href={l.href}
                className={`nav-link ${active === l.href ? 'active' : ''}`}
                aria-current={active === l.href ? 'page' : undefined}
                onClick={goTo(l.href)}
              >
                {l.label}
              </a>
            </li>
          ))}

          {/* Drawer-only footer: the booking CTA and a way to reach a human. */}
          <li className="nav-drawer__foot" aria-hidden={!menuOpen}>
            <Link to="/flotte" className="btn btn-accent btn-lg btn-full" onClick={close}>
              Voir notre flotte →
            </Link>
            <div className="nav-drawer__contact">
              {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer" className="nav-drawer__contact-btn">
                  <SocialIcon name="whatsapp" /> WhatsApp
                </a>
              )}
              {settings.phone && (
                <a href={`tel:+${settings.phone}`} className="nav-drawer__contact-btn">
                  <Icon name="phone" /> {formatPhone(settings.phone)}
                </a>
              )}
            </div>
          </li>
        </ul>

        {/* Persistent actions, outside the drawer */}
        <div className="nav-actions">
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="nav-icon-btn"
              aria-label="Nous écrire sur WhatsApp"
              title="WhatsApp"
            >
              <SocialIcon name="whatsapp" />
            </a>
          )}
          {/* Goes to the full fleet page, which nothing else in the header
              reached. The label matches the destination — "Réserver" pointed at
              a search form and set the wrong expectation. */}
          <Link to="/flotte" className="btn btn-accent nav-cta" onClick={close}>
            Voir notre flotte
          </Link>

          <button
            className={`hamburger ${menuOpen ? 'active' : ''}`}
            onClick={() => setMenuOpen(v => !v)}
            aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={menuOpen}
          >
            <span /><span /><span />
          </button>
        </div>
      </div>
    </nav>
  )
}
