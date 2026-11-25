import { useState, useEffect, useRef } from 'react'
import { scrollToSection, focusBooking } from '../lib/scroll'
import { Link, useNavigate } from 'react-router-dom'
import Logo from './Logo'
import Icon from './Icon'
import SocialIcon from './SocialIcon'
import { useSettings } from '../lib/SettingsContext'
import { formatPhone, waLink } from '../lib/contact'

const links = [
  // The one section already on the bar at the top of the home page (index.css).
  { href: '#accueil', label: 'Accueil', home: true },
  { href: '#flotte', label: 'Notre Flotte' },
  { href: '#comment', label: 'Comment ça marche' },
  { href: '#services', label: 'Services' },
  { href: '#avis', label: 'Avis' },
  { href: '#contact', label: 'Contact' },
]

// The search card of the hero.
const BOOK = '#reserver'

export default function Navbar({ minimal = false }) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  // The menu is sliding in or out. Otherwise it changes place without a transition:
  // turning a tablet would show it sliding away.
  const [sliding, setSliding] = useState(false)
  const [active, setActive] = useState('#accueil')
  // The link under the mouse: the underline previews it.
  const [hovered, setHovered] = useState(null)
  const listRef = useRef(null)
  // Section to jump to once the drawer has closed and the scroll lock released.
  const pendingHash = useRef(null)
  const { settings, status } = useSettings()
  const navigate = useNavigate()

  const menuOpenRef = useRef(false)
  useEffect(() => { menuOpenRef.current = menuOpen }, [menuOpen])

  useEffect(() => {
    // While the phone menu is open the page is pinned and reads as scrolled to
    // the top: the bar keeps its state instead of sliding away behind the menu.
    const onScroll = () => { if (!menuOpenRef.current) setScrolled(window.scrollY > 40) }
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

  // Where the underline goes: under the text of the link the mouse is on, else
  // of the current section's.
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const place = () => {
      const link = (hovered && list.querySelector(`.nav-link[href="${hovered}"]`)) || list.querySelector('.nav-link.active')
      // No line while the current section has no link on the bar (the hero).
      if (!link || !link.offsetWidth) { list.style.setProperty('--ink-w', 0); return }
      const pad = parseFloat(getComputedStyle(link).paddingLeft) || 0
      const box = list.getBoundingClientRect()
      const at = link.getBoundingClientRect()
      list.style.setProperty('--ink-x', `${at.left - box.left + pad}px`)
      list.style.setProperty('--ink-w', (at.width - pad * 2) / 100)
    }
    place()
    // The links change width once the font is there.
    document.fonts?.ready.then(place)
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [active, hovered])

  useEffect(() => {
    if (menuOpen) { setSliding(true); return }
    const timer = setTimeout(() => setSliding(false), 400)
    return () => clearTimeout(timer)
  }, [menuOpen])

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
          if (target === BOOK) focusBooking()
          else scrollToSection(target.slice(1))
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
  const book = () => {
    if (menuOpen) {
      pendingHash.current = BOOK
      setMenuOpen(false)
    } else if (!focusBooking()) {
      navigate('/', { state: { scrollToId: BOOK.slice(1) } })      // error pages
    }
  }
  const wa = settings.whatsapp
    ? waLink(settings.whatsapp, 'Bonjour YASSIR CARS, je souhaite des informations.')
    : null

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`} aria-label="Navigation principale">
      {/* The bar spans the screen; the container lines its content up with the page's. */}
      <div className="container">
      <div className="nav-inner">
        <a href="#accueil" className="nav-brand" onClick={goTo('#accueil')}>
          <Logo size={38} />
        </a>

        {!minimal && (
        <ul
          id="nav-menu"
          className={`nav-links ${menuOpen ? 'open' : ''} ${menuOpen || sliding ? 'slides' : ''}`}
          ref={listRef}
          onPointerLeave={() => setHovered(null)}
        >
          {/* Drawer-only header: without it the open menu is six links adrift
              on an empty screen, with no branding and no way back. */}
          <li className="nav-drawer__top" aria-hidden={!menuOpen}>
            <Logo size={34} />
            <button className="menu-close" onClick={close} aria-label="Fermer le menu">
              <Icon name="close" size={18} />
            </button>
          </li>

          {links.map((l, i) => (
            <li key={l.href} style={{ '--row': i }} className={l.home ? 'nav-item--home' : undefined}>
              <a
                href={l.href}
                className={`nav-link ${active === l.href ? 'active' : ''}`}
                aria-current={active === l.href ? 'page' : undefined}
                onClick={goTo(l.href)}
                onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHovered(l.href) }}
              >
                {l.label}
              </a>
            </li>
          ))}

          <li className="nav-ink" role="presentation" />

          {/* Drawer-only footer: the booking CTA and a way to reach a human. */}
          <li className="nav-drawer__foot" style={{ '--row': links.length }} aria-hidden={!menuOpen}>
            <button type="button" className="btn btn-accent btn-lg btn-full" onClick={book}>
              Réserver une voiture
            </button>
            <Link to="/flotte" className="btn btn-outline btn-full" onClick={close}>
              Voir notre flotte <Icon name="arrowRight" />
            </Link>
            <div className="nav-drawer__contact">
              {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer" className="nav-drawer__contact-btn nav-drawer__contact-btn--wa">
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
        )}

        {/* Persistent actions, outside the drawer */}
        <div className="nav-actions">
          {/* Holds its place while the number loads. */}
          {!wa && status === 'loading' && <span className="nav-icon-btn is-waiting" aria-hidden="true" />}
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="nav-icon-btn nav-icon-btn--wa"
              aria-label="Nous écrire sur WhatsApp"
              title="WhatsApp"
            >
              <SocialIcon name="whatsapp" />
            </a>
          )}
          {/* Same action as the hero's search, not a second one competing with
              it: goes to the search card and puts the cursor in it. The fleet
              stays one click away in the links. */}
          <button type="button" className="btn btn-dark nav-cta" onClick={book}>
            Réserver <Icon name="arrowRight" className="btn__arrow" />
          </button>

          {!minimal && (
            <button
              className={`hamburger ${menuOpen ? 'active' : ''}`}
              onClick={() => setMenuOpen(v => !v)}
              aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={menuOpen}
              aria-controls="nav-menu"
            >
              <span /><span /><span />
            </button>
          )}
        </div>
      </div>
      </div>
    </nav>
  )
}
