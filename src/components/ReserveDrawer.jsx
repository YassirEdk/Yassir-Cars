import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import DatePicker from './DatePicker'
import FeaturePills from './FeaturePills'
import Icon from './Icon'
import SocialIcon from './SocialIcon'
import { moroccanCities, addDays, colorName } from '../data'
import { isCarAvailable } from '../lib/cars'
import { useSettings } from '../lib/SettingsContext'
import { useCurrency } from '../lib/CurrencyContext'
import { formatMoney } from '../lib/currency'
import { waLink } from '../lib/contact'
import { discounted, discountLabel, rateForCar } from '../lib/pricing'
import './reservedrawer.css'

// Kept in step with the slide-out animation in reservedrawer.css.
const CLOSE_MS = 260

function fmtFr(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/* Day of the week under each date ("vendredi"), so a picked date is never just
   three numbers. */
function weekday(iso) {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('fr-FR', { weekday: 'long' })
}

/* The unit (colour) the drawer shows by default: the first one still free for
   the chosen dates, so the visitor never lands on a colour they can't book. */
function defaultUnit(car, depart, retour) {
  const units = car?.units?.length ? car.units : [car]
  return units.find(u => isCarAvailable(u, depart, retour)) ?? units[0] ?? car
}

/* Booking panel. Opened from a result card, and from the car cards on the home
   page / fleet once the availability popup has the dates — so booking never
   leaves the page the visitor is on. */
export default function ReserveDrawer({ car, depart, retour, lieu, initialColor = null, onClose }) {
  const { settings } = useSettings()
  const { currency } = useCurrency()
  const minDays = settings.minRentalDays
  const todayISO = new Date().toISOString().slice(0, 10)

  // Colour picked inside the drawer; reset whenever the visitor moves to
  // another vehicle.
  const [selColor, setSelColor] = useState(initialColor)
  const [curPhoto, setCurPhoto] = useState(0)
  const [form, setForm] = useState({ fullName: '', lieu: lieu || '', depart: depart || '', retour: retour || '' })
  const [error, setError] = useState('')
  const [sent, setSent] = useState(null)   // { url, text }
  const [copied, setCopied] = useState(false)
  // Bumped once the start date is picked, to pop the end calendar open.
  const [endKey, setEndKey] = useState(0)

  /* The calendar drops below its field inside a scroll box, so opened low in
     the panel it would be cut off. Bring the date row up first — then the
     calendar always has room. */
  const scrollRef = useRef(null)
  const datesRef = useRef(null)
  const revealDates = () => {
    requestAnimationFrame(() => {
      const box = scrollRef.current
      const dates = datesRef.current
      if (!box || !dates) return
      const delta = dates.getBoundingClientRect().top - box.getBoundingClientRect().top - 14
      if (delta > 4) box.scrollTo({ top: box.scrollTop + delta, behavior: 'smooth' })
    })
  }

  /* Closing is animated, so the panel can't simply unmount on click: it plays
     the slide-out first and only then tells the page to drop it. */
  const [closing, setClosing] = useState(false)
  const closeTimer = useRef(0)
  const requestClose = useCallback(() => {
    if (closeTimer.current) return          // already on the way out
    setClosing(true)
    closeTimer.current = setTimeout(onClose, CLOSE_MS)
  }, [onClose])
  useEffect(() => () => clearTimeout(closeTimer.current), [])

  useEffect(() => {
    setSelColor(initialColor); setCurPhoto(0); setSent(null); setError('')
  }, [car?.id])

  /* The drawer starts just below the top nav and the mini search bar instead of
     covering them, so the city and the dates stay reachable while it is open.
     The mini search scrolls away and the nav is sticky, so the offset is
     measured live rather than hard-coded. */
  const [topOffset, setTopOffset] = useState(0)
  useEffect(() => {
    let frame = 0
    let last = -1
    const read = () => {
      frame = 0
      // Results page chrome, plus the site navbar on the home / fleet pages.
      const bottoms = ['.results-nav', '.mini-search', '.navbar']
        .map(sel => document.querySelector(sel)?.getBoundingClientRect().bottom ?? 0)
      // Rounded + compared: a re-render per scroll event (several per frame)
      // made the panel judder against the page as it moved.
      const next = Math.round(Math.max(0, ...bottoms))
      if (next !== last) { last = next; setTopOffset(next) }
    }
    // One measurement per animation frame, whatever the scroll event rate.
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(read) }
    read()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  // Escape closes. The page behind stays scrollable on purpose — the drawer is
  // a side panel, not a modal: the visitor keeps browsing the results while it
  // is open.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') requestClose() }
    document.addEventListener('keydown', onKey)
    document.body.classList.add('drawer-open')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('drawer-open')
    }
  }, [requestClose])

  const allUnits = car?.units?.length ? car.units : (car ? [car] : [])
  const colors = car?.colors ?? (car?.color ? [car.color] : [])
  const active = useMemo(() => {
    if (!car) return null
    if (selColor) return allUnits.find(u => u.color === selColor) ?? car
    return defaultUnit(car, depart, retour)
  }, [car, selColor, depart, retour])

  const gallery = useMemo(() => {
    if (!active) return []
    return active.photos?.length ? active.photos : (active.photo ? [active.photo] : [])
  }, [active])

  if (!car || !active) return null

  const effColor = active.color ?? selColor ?? null
  const available = isCarAvailable(active, form.depart, form.retour)

  const rate = rateForCar(active.id, settings)
  const promoPrice = discounted(active.price, rate)
  const promoLabel = discountLabel(rate)

  const days = (() => {
    if (!form.depart || !form.retour) return null
    const diff = (new Date(form.retour) - new Date(form.depart)) / 86_400_000
    return diff > 0 ? Math.ceil(diff) : null
  })()

  const pickColor = (hex) => {
    const unit = allUnits.find(u => u.color === hex)
    setSelColor(hex)
    setCurPhoto(0)
    if (unit) setError('')
  }

  const buildMessage = () => [
    `Bonjour YASSIR CARS`,
    ``,
    `Je souhaite réserver le véhicule suivant :`,
    `Voiture : *${car.name}*${effColor ? ` — ${colorName(effColor)}` : ''}`,
    ``,
    `Nom complet : ${form.fullName.trim()}`,
    form.lieu   ? `Lieu : ${form.lieu}` : '',
    form.depart ? `Date de début : ${fmtFr(form.depart)}` : '',
    form.retour ? `Date de fin : ${fmtFr(form.retour)}` : '',
    days        ? `Durée : ${days === 1 ? '1 jour' : `${days} jours`}` : '',
    (promoPrice && days)
      ? `Prix estimé : ${formatMoney(promoPrice * days, currency)}${currency !== 'MAD' ? ` (≈ ${(promoPrice * days).toLocaleString('fr-FR')} MAD)` : ''}`
      : '',
    ``,
    `Merci !`,
  ].filter(Boolean).join('\n')

  const handleWhatsApp = () => {
    if (!form.fullName.trim()) return setError('Veuillez entrer votre nom complet.')
    if (!form.lieu)   return setError('Veuillez choisir le lieu de prise en charge.')
    if (!form.depart) return setError('Veuillez choisir la date de départ.')
    if (!form.retour) return setError('Veuillez choisir la date de retour.')
    if (form.retour < addDays(form.depart, minDays))
      return setError(`La location doit durer au moins ${minDays} jours.`)
    setError('')

    const text = buildMessage()
    const url = waLink(settings.whatsapp, text)
    window.open(url, '_blank', 'noopener,noreferrer')
    setSent({ url, text })
    setCopied(false)
  }

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(sent.text)
      setCopied(true)
    } catch { setCopied(false) }
  }

  // State handed to the full /reserver page, so "voir la page complète" opens
  // exactly the car and colour shown here.
  const fullPageState = {
    nom: car.name,
    from: '/resultats',
    carId: active.id,
    couleur: effColor ? colorName(effColor) : '',
    photo: gallery[curPhoto] || '',
    photos: gallery,
    features: active.features,
    prix: active.price,
    depart: form.depart,
    retour: form.retour,
    lieu: form.lieu,
  }

  /* Rendered on <body>: a car card is inside animated/transformed wrappers,
     and a transformed ancestor would break `position: fixed`. */
  return createPortal(
    <>
      <div className={`rd-scrim ${closing ? 'rd-scrim--closing' : ''}`} onClick={requestClose} aria-hidden />
      <aside
        className={`rd-drawer ${closing ? 'rd-drawer--closing' : ''}`}
        style={{ top: `${topOffset}px` }}
        role="dialog"
        aria-modal="false"
        aria-label={`Réserver ${car.name}`}
      >

        {/* Top bar — always says which car is being booked, even scrolled down */}
        <header className="rd-top">
          <div className="rd-top__txt">
            <span className="rd-top__eyebrow">Réservation</span>
            <span className="rd-top__name">{car.name}</span>
          </div>
          <button type="button" className="rd-top__close" onClick={requestClose} aria-label="Fermer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
              strokeLinecap="round" width="17" height="17"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </header>

        {/* Keyed on the car: switching vehicles replays the animation and
            returns the panel to the top. */}
        <div className="rd-scroll" key={car.id} ref={scrollRef}>

          {sent ? (
            <section className="rd-card rd-sent">
              <div className="rd-sent__icon"><Icon name="checkCircle" /></div>
              <h3 className="rd-sent__title">Demande envoyée</h3>
              <p className="rd-sent__sub">
                Votre demande pour la <strong>{car.name}</strong> a été préparée dans WhatsApp.
                Envoyez le message pour la confirmer.
              </p>
              <pre className="rd-sent__msg">{sent.text}</pre>
              <a href={sent.url} target="_blank" rel="noopener noreferrer" className="rd-btn rd-btn--wa">
                <SocialIcon name="whatsapp" /> WhatsApp ne s’est pas ouvert ?
              </a>
              <div className="rd-sent__actions">
                <button type="button" className="rd-btn rd-btn--ghost" onClick={copyMessage}>
                  {copied ? 'Message copié ✓' : 'Copier le message'}
                </button>
                <button type="button" className="rd-btn rd-btn--ghost" onClick={() => setSent(null)}>
                  Modifier ma demande
                </button>
              </div>
              <button type="button" className="rd-textlink" onClick={requestClose}>
                ← Continuer à parcourir les véhicules
              </button>
            </section>
          ) : (
            <>
              {/* ── The car ── */}
              <figure className="rd-hero">
                {gallery[curPhoto] ? (
                  <>
                    <div className="rd-hero__blur" style={{ backgroundImage: `url(${gallery[curPhoto]})` }} />
                    <img key={gallery[curPhoto]} src={gallery[curPhoto]} alt={car.name} className="rd-hero__img" />
                  </>
                ) : (
                  <div className="rd-hero__none" style={{ background: active.brandColor }}>
                    {active.brandLogo
                      ? <img src={active.brandLogo} alt={car.name} style={active.whiteFilter ? { filter: 'brightness(0) invert(1)' } : {}} />
                      : <span>{car.name.split(' ')[0]}</span>}
                  </div>
                )}

                <span className={`rd-tag ${available ? 'rd-tag--ok' : 'rd-tag--no'}`}>
                  {available
                    ? <><Icon name="checkCircle" /> Disponible</>
                    : <><Icon name="clock" /> Non disponible</>}
                </span>

                {gallery.length > 1 && (
                  <>
                    {curPhoto > 0 && (
                      <button type="button" className="rd-hero__nav rd-hero__nav--prev"
                        onClick={() => setCurPhoto(i => i - 1)} aria-label="Photo précédente">‹</button>
                    )}
                    {curPhoto < gallery.length - 1 && (
                      <button type="button" className="rd-hero__nav rd-hero__nav--next"
                        onClick={() => setCurPhoto(i => i + 1)} aria-label="Photo suivante">›</button>
                    )}
                    <div className="rd-hero__dots">
                      {gallery.map((_, i) => (
                        <button type="button" key={i}
                          className={`rd-hero__dot ${i === curPhoto ? 'active' : ''}`}
                          onClick={() => setCurPhoto(i)} aria-label={`Photo ${i + 1}`} />
                      ))}
                    </div>
                  </>
                )}
              </figure>

              <section className="rd-card">
                <div className="rd-carhead">
                  <div>
                    <h2 className="rd-carhead__name">{car.name}</h2>
                    <span className="rd-carhead__cat">{car.category}</span>
                  </div>
                  <div className="rd-carhead__price">
                    <span className="rd-carhead__amount">{formatMoney(promoPrice, currency)}</span>
                    <span className="rd-carhead__per">par jour</span>
                    {promoLabel && (
                      <span className="rd-carhead__promo">
                        <s>{formatMoney(active.price, currency)}</s> {promoLabel}
                      </span>
                    )}
                  </div>
                </div>

                <div className="rd-specs">
                  <div className="rd-spec"><Icon name="fuel" /><span>{active.fuel}</span></div>
                  <div className="rd-spec"><Icon name="gear" /><span>{active.transmission}</span></div>
                  <div className="rd-spec"><Icon name="users" /><span>{active.seats} places</span></div>
                </div>

                {colors.length > 0 && (
                  <div className="rd-colors">
                    <span className="rd-colors__title">
                      Couleur{effColor && <strong> · {colorName(effColor)}</strong>}
                    </span>
                    <div className="rd-colors__row">
                      {colors.map(hex => {
                        const unit = allUnits.find(u => u.color === hex)
                        const free = !unit || isCarAvailable(unit, form.depart, form.retour)
                        return (
                          <button
                            type="button" key={hex}
                            className={`rd-color ${hex === effColor ? 'active' : ''} ${form.depart && !free ? 'taken' : ''}`}
                            style={{ background: hex }}
                            title={`${colorName(hex)}${form.depart && !free ? ' — réservé' : ''}`}
                            onClick={() => pickColor(hex)}
                            aria-label={`Couleur ${colorName(hex)}`}
                          />
                        )
                      })}
                    </div>
                  </div>
                )}

                <FeaturePills features={active.features} className="rd-equip" pillClass="rd-equip-pill" />
              </section>

              {/* ── Step 1: when ── */}
              <section className="rd-card">
                <h3 className="rd-card__title"><span className="rd-step">1</span> Vos dates</h3>

                {/* Same DatePicker as the search bar and the booking page, so
                    the calendar looks and behaves identically everywhere. */}
                <div className="rd-dates" ref={datesRef} onMouseDown={revealDates}>
                  <div className={`rd-date ${form.depart ? 'is-set' : ''}`}>
                    <span className="rd-date__label">
                      <Icon name="calendar" /> Date début <span className="rd-req">*</span>
                    </span>
                    <DatePicker
                      value={form.depart}
                      onChange={v => {
                        setForm(f => ({
                          ...f,
                          depart: v,
                          // Keep the pair coherent instead of leaving an end
                          // date that contradicts the new start.
                          retour: f.retour && f.retour < addDays(v, minDays) ? '' : f.retour,
                        }))
                        // Chain straight into the end date, no second click.
                        setEndKey(k => k + 1)
                      }}
                      placeholder="Choisir…"
                      className="rd-dp"
                    />
                    <span className="rd-date__day">{weekday(form.depart) || 'à choisir'}</span>
                  </div>

                  <div className={`rd-date ${form.retour ? 'is-set' : ''}`}>
                    <span className="rd-date__label">
                      <Icon name="calendar" /> Date fin <span className="rd-req">*</span>
                    </span>
                    <DatePicker
                      value={form.retour}
                      onChange={v => setForm(f => ({ ...f, retour: v }))}
                      min={form.depart ? addDays(form.depart, minDays) : undefined}
                      highlight={form.depart || undefined}
                      placeholder="Choisir…"
                      className="rd-dp"
                      openKey={endKey}
                    />
                    <span className="rd-date__day">{weekday(form.retour) || 'à choisir'}</span>
                  </div>
                </div>

                <p className="rd-note">
                  <Icon name="clock" />
                  {days
                    ? <><strong>{days} jour{days > 1 ? 's' : ''}</strong> de location</>
                    : <>Location minimum : {minDays} jour{minDays > 1 ? 's' : ''}</>}
                </p>

                {days && (
                  <div className="rd-recap">
                    <div className="rd-recap__row">
                      <span>{formatMoney(promoPrice, currency)} × {days} jour{days > 1 ? 's' : ''}</span>
                      <span>{formatMoney(promoPrice * days, currency)}</span>
                    </div>
                    {promoLabel && (
                      <div className="rd-recap__row rd-recap__row--save">
                        <span>Remise {promoLabel}</span>
                        <span>− {formatMoney((active.price - promoPrice) * days, currency)}</span>
                      </div>
                    )}
                    <div className="rd-recap__total">
                      <span>Total estimé</span>
                      <strong>{formatMoney(promoPrice * days, currency)}</strong>
                    </div>
                  </div>
                )}
              </section>

              {/* ── Step 2: who ── */}
              <section className="rd-card">
                <h3 className="rd-card__title"><span className="rd-step">2</span> Vos coordonnées</h3>

                <label className="rd-field">
                  <span className="rd-field__label">Nom complet <span className="rd-req">*</span></span>
                  <input
                    type="text" className="rd-input" placeholder="Mohammed Alami"
                    value={form.fullName}
                    onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  />
                </label>

                <label className="rd-field">
                  <span className="rd-field__label">Lieu de prise en charge <span className="rd-req">*</span></span>
                  <select
                    className={`rd-input ${!form.lieu ? 'is-placeholder' : ''}`}
                    value={form.lieu}
                    onChange={e => setForm(f => ({ ...f, lieu: e.target.value }))}
                  >
                    <option value="" disabled>Choisissez une ville…</option>
                    {moroccanCities.map(city => <option key={city} value={city}>{city}</option>)}
                  </select>
                </label>
              </section>

              {!available && (
                <p className="rd-alert rd-alert--warn">
                  <Icon name="clock" />
                  Cette couleur est déjà réservée pour ces dates — choisissez une autre couleur,
                  d’autres dates ou un autre véhicule.
                </p>
              )}
              {error && <p className="rd-alert rd-alert--error"><Icon name="clock" /> {error}</p>}

              <div className="rd-trust">
                <span><Icon name="shield" /> Assurance incluse</span>
                <span><Icon name="check" /> Annulation gratuite</span>
                <span><Icon name="phone" /> Support 24h/24</span>
              </div>

              <Link to="/reserver" state={fullPageState} className="rd-textlink">
                Ouvrir la page complète →
              </Link>
            </>
          )}
        </div>

        {/* Sticky action bar — the price and the way to book never scroll away */}
        {!sent && (
          <footer className="rd-cta">
            <div className="rd-cta__price">
              <span className="rd-cta__label">{days ? `Total · ${days} jour${days > 1 ? 's' : ''}` : 'À partir de'}</span>
              <strong className="rd-cta__amount">
                {days ? formatMoney(promoPrice * days, currency) : `${formatMoney(promoPrice, currency)} / j`}
              </strong>
            </div>
            <button type="button" className="rd-btn rd-btn--wa" onClick={handleWhatsApp}>
              <SocialIcon name="whatsapp" /> Réserver
            </button>
          </footer>
        )}
      </aside>
    </>,
    document.body,
  )
}
