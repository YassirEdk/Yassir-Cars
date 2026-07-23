import { useState, useMemo } from 'react'
import { useSearchParams, useLocation, Link } from 'react-router-dom'
import Logo from '../components/Logo'
import DatePicker from '../components/DatePicker'
import FeaturePills from '../components/FeaturePills'
import { moroccanCities, addDays } from '../data'
import { useSettings } from '../lib/SettingsContext'
import { useCurrency } from '../lib/CurrencyContext'
import { formatMoney } from '../lib/currency'
import { waLink } from '../lib/contact'
import { discounted, discountLabel, rateForCar } from '../lib/pricing'
import './reserver.css'

function fmt(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/* ── Crisp SVG icons (Lucide-style, 20×20) ────────────────────────────────── */
const IcoUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" width={20} height={20} aria-hidden>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const IcoPin = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" width={20} height={20} aria-hidden>
    <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)

const IcoCalStart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" width={20} height={20} aria-hidden>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
    <path d="m9 16 2 2 4-4" />
  </svg>
)

const IcoCalEnd = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" width={20} height={20} aria-hidden>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
    <path d="M9 16h6M12 13v6" />
  </svg>
)

const IcoClock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" width={18} height={18} aria-hidden>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
)

const IcoTag = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" width={18} height={18} aria-hidden>
    <path d="M12 2H2v10l9.29 9.29a1 1 0 0 0 1.42 0l7.29-7.29a1 1 0 0 0 0-1.42Z" />
    <path d="M7 7h.01" />
  </svg>
)

const IcoCar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"
    strokeLinecap="round" strokeLinejoin="round" width={72} height={72} aria-hidden>
    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
    <circle cx="7" cy="17" r="2" /><path d="M9 17h6" /><circle cx="17" cy="17" r="2" />
  </svg>
)

const IcoAlert = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" width={18} height={18} aria-hidden>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)

const IcoCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" strokeLinejoin="round" width={34} height={34} aria-hidden>
    <path d="M20 6 9 17l-5-5" />
  </svg>
)

const IcoCopy = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" width={18} height={18} aria-hidden>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)

const IcoClipboard = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" width={28} height={28} aria-hidden>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" />
    <path d="M9 12h6M9 16h4" />
  </svg>
)

const IcoShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" width={18} height={18} aria-hidden>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
)

const IcoRefresh = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" width={18} height={18} aria-hidden>
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    <path d="M3 21v-5h5" />
  </svg>
)

const IcoGauge = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" width={18} height={18} aria-hidden>
    <path d="m12 14 4-4" />
    <path d="M3.34 19a10 10 0 1 1 17.32 0" />
  </svg>
)

/* ── WhatsApp icon ────────────────────────────────────────────────────────── */
const IcoWhatsApp = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22" aria-hidden>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
  </svg>
)

export default function Reserver() {
  const [params] = useSearchParams()
  const location = useLocation()
  const { settings } = useSettings()
  const minDays = settings.minRentalDays
  const { currency } = useCurrency()

  // Reservation details travel via router state, so the URL stays clean
  // (/reserver). We mirror them into sessionStorage so a page refresh keeps
  // them, and still accept legacy ?query= params for any old/shared links.
  const data = useMemo(() => {
    const s = location.state
    if (s && (s.nom || s.photos)) {
      try { sessionStorage.setItem('yc_resa', JSON.stringify(s)) } catch { /* storage blocked */ }
      return s
    }
    try {
      const saved = sessionStorage.getItem('yc_resa')
      if (saved) return JSON.parse(saved)
    } catch { /* storage blocked / bad JSON */ }
    return {
      nom: params.get('nom') || '',
      couleur: params.get('couleur') || '',
      photo: params.get('photo') || '',
      prix: params.get('prix') || '',
      depart: params.get('depart') || '',
      retour: params.get('retour') || '',
      lieu: params.get('lieu') || '',
    }
  }, [location.state, params])

  // No car was carried in (someone opened /reserver directly): we can't build
  // a real reservation, so we block the page with a popup back to the home page.
  const hasCar = Boolean(data.nom)

  const carName    = data.nom     || 'Véhicule'
  const carColor   = data.couleur || ''
  const photo      = data.photo   || ''
  const prix       = data.prix    || ''
  const initDepart = data.depart  || ''
  const initRetour = data.retour  || ''
  const initLieu   = data.lieu    || ''

  // Full gallery comes via router state; fall back to the single photo.
  const statePhotos = data.photos
  const gallery = (Array.isArray(statePhotos) && statePhotos.length)
    ? statePhotos
    : (photo ? [photo] : [])

  // Équipements/options of the selected car (keys → label + icon via data.js).
  const features = Array.isArray(data.features) ? data.features : []
  const [curPhoto, setCurPhoto] = useState(0)
  const goPhoto = (dir) => setCurPhoto(i => Math.min(gallery.length - 1, Math.max(0, i + dir)))

  const [form, setForm] = useState({
    fullName: '',
    lieu: initLieu,
    depart: initDepart,
    retour: initRetour,
  })
  const [error, setError] = useState('')

  /* Where the "back" link goes. It used to be a bare <Link to="/resultats">,
     which sent everyone to a parameterless search — so arriving from the home
     page (where there were no results to begin with) dropped the city and both
     dates. The origin travels in router state, and the search is rebuilt from
     the values currently in the form. */
  const back = useMemo(() => {
    const origin = data.from || ''
    if (origin === '/resultats') {
      const p = new URLSearchParams()
      if (form.lieu)   p.set('lieu', form.lieu)
      if (form.depart) p.set('depart', form.depart)
      if (form.retour) p.set('retour', form.retour)
      const qs = p.toString()
      return { href: qs ? `/resultats?${qs}` : '/resultats', label: 'Retour aux résultats' }
    }
    if (origin === '/flotte') return { href: '/flotte', label: 'Retour à la flotte' }
    return { href: '/', label: 'Retour à l’accueil' }
  }, [data.from, form.lieu, form.depart, form.retour])

  // Set once the request has been handed off to WhatsApp. Holds the wa.me URL so
  // the confirmation panel can offer it again when the popup was blocked.
  const [sent, setSent] = useState(null)   // { url, text }
  const [copied, setCopied] = useState(false)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const days = (() => {
    if (!form.depart || !form.retour) return null
    const diff = (new Date(form.retour) - new Date(form.depart)) / 86_400_000
    return diff > 0 ? Math.ceil(diff) : null
  })()

  // Resolve the promotion from the car id carried in, so this page can't show a
  // discount the car no longer has.
  const rate = rateForCar(data.carId, settings)
  const promoPrice = prix ? discounted(Number(prix), rate) : null
  const promoLabel = discountLabel(rate)

  // Every line is conditional: a missing value drops its whole line rather than
  // sending "Lieu : " or "Durée : null jours" to the agency.
  const buildMessage = () => [
    `Bonjour YASSIR CARS`,
    ``,
    `Je souhaite réserver le véhicule suivant :`,
    `Voiture : *${carName}*${carColor ? ` — ${carColor}` : ''}`,
    ``,
    `Nom complet : ${form.fullName.trim()}`,
    form.lieu   ? `Lieu : ${form.lieu}` : '',
    form.depart ? `Date de début : ${fmt(form.depart)}` : '',
    form.retour ? `Date de fin : ${fmt(form.retour)}` : '',
    days        ? `Durée : ${days === 1 ? '1 jour' : `${days} jours`}` : '',
    (promoPrice && days)
      ? `Prix estimé : ${formatMoney(promoPrice * days, currency)}${currency !== 'MAD' ? ` (≈ ${(promoPrice * days).toLocaleString('fr-FR')} MAD)` : ''}`
      : '',
    ``,
    `Merci !`,
  ].filter(Boolean).join('\n')

  const handleWhatsApp = () => {
    // Validate everything the agency needs to act on the request — previously
    // only the name was checked, so requests arrived with no city and no dates.
    if (!form.fullName.trim()) return setError('Veuillez entrer votre nom complet.')
    if (!form.lieu)   return setError('Veuillez choisir le lieu de prise en charge.')
    if (!form.depart) return setError('Veuillez choisir la date de départ.')
    if (!form.retour) return setError('Veuillez choisir la date de retour.')
    if (form.retour < addDays(form.depart, minDays))
      return setError(`La location doit durer au moins ${minDays} jours.`)
    setError('')

    const text = buildMessage()
    const url = waLink(settings.whatsapp, text)
    // window.open can be swallowed (iOS Safari, popup blockers). Show the
    // confirmation panel either way — it carries the link as a fallback so the
    // customer is never left thinking the request went through when it didn't.
    window.open(url, '_blank', 'noopener,noreferrer')
    setSent({ url, text })
    setCopied(false)
  }

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(sent.text)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  if (!hasCar) {
    return (
      <div className="rv-page rv-empty">
        <div className="rv-empty__card">
          <div className="rv-empty__icon"><IcoCar /></div>
          <h2 className="rv-empty__title">Aucune voiture sélectionnée</h2>
          <p className="rv-empty__text">
            Veuillez d’abord choisir une voiture et la durée de location avant de réserver.
          </p>
          <Link to="/" className="rv-empty__btn">C’est parti</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="rv-page">

      {/* Sticky top bar */}
      <header className="rv-topbar">
        <Link to="/" className="rv-topbar__logo"><Logo size={36} animated={false} /></Link>
        <Link to={back.href} className="rv-topbar__back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          {back.label}
        </Link>
      </header>

      <div className="rv-split">

        {/* ── Left: car image panel ── */}
        <aside className="rv-left">
          {gallery[curPhoto] && <div className="rv-left__blur" style={{ backgroundImage: `url(${gallery[curPhoto]})` }} />}
          <div className="rv-left__inner">
            <div className="rv-left__frame">
              {gallery[curPhoto] && <div className="rv-left__frame-blur" style={{ backgroundImage: `url(${gallery[curPhoto]})` }} />}
              {gallery.length
                ? <img key={gallery[curPhoto]} src={gallery[curPhoto]} alt={carName} className="rv-left__img" />
                : <div className="rv-left__noimg"><IcoCar /></div>}

              {gallery.length > 1 && curPhoto > 0 && (
                <button type="button" className="rv-gallery-nav rv-gallery-nav--prev"
                  onClick={() => goPhoto(-1)} aria-label="Photo précédente">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round" width={22} height={22}>
                    <path d="m15 18-6-6 6-6"/>
                  </svg>
                </button>
              )}
              {gallery.length > 1 && curPhoto < gallery.length - 1 && (
                <button type="button" className="rv-gallery-nav rv-gallery-nav--next"
                  onClick={() => goPhoto(1)} aria-label="Photo suivante">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round" width={22} height={22}>
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </button>
              )}
            </div>

            {gallery.length > 1 && (
              <div className="rv-gallery-dots">
                {gallery.map((_, i) => (
                  <button type="button" key={i}
                    className={`rv-gallery-dot ${i === curPhoto ? 'active' : ''}`}
                    onClick={() => setCurPhoto(i)} aria-label={`Photo ${i + 1}`} />
                ))}
              </div>
            )}
          </div>
          <div className="rv-left__info">
            <span className="rv-left__eyebrow">Votre réservation</span>
            <h1 className="rv-left__name">{carName}</h1>
            {promoPrice && (
              <div className="rv-left__pricing">
                <span className="rv-left__promo">{formatMoney(promoPrice, currency)}</span>
                <span className="rv-left__per">/ jour</span>
                {promoLabel && <>
                  <s className="rv-left__old">{formatMoney(Number(prix), currency)}</s>
                  <span className="rv-left__discount">{promoLabel}</span>
                </>}
              </div>
            )}
            <FeaturePills features={features} className="rv-left__equip" pillClass="rv-equip-pill" />
          </div>
        </aside>

        {/* ── Right: form ── */}
        <section className="rv-right">
          <div className="rv-card">
            {sent ? (
              /* ── Sent: confirm what left, and keep a way through if the
                    WhatsApp tab was blocked by the browser. ── */
              <div className="rv-sent">
                <div className="rv-sent__icon"><IcoCheck /></div>
                <h2 className="rv-sent__title">Demande envoyée</h2>
                <p className="rv-sent__sub">
                  Votre demande pour la <strong>{carName}</strong> a été préparée dans WhatsApp.
                  Envoyez le message pour la confirmer — l’agence vous répond en général sous 1&nbsp;heure.
                </p>

                <pre className="rv-sent__msg">{sent.text}</pre>

                <a href={sent.url} target="_blank" rel="noopener noreferrer" className="rv-wa-btn">
                  <IcoWhatsApp />
                  WhatsApp ne s’est pas ouvert ? Cliquez ici
                </a>

                <div className="rv-sent__actions">
                  <button type="button" className="rv-sent__copy" onClick={copyMessage}>
                    <IcoCopy /> {copied ? 'Message copié' : 'Copier le message'}
                  </button>
                  <button type="button" className="rv-sent__back" onClick={() => setSent(null)}>
                    Modifier ma demande
                  </button>
                </div>

                <Link to={back.href} className="rv-sent__link">← {back.label}</Link>
              </div>
            ) : (
            <>
            <div className="rv-card__header">
              <div className="rv-card__icon"><IcoClipboard /></div>
              <div>
                <h2 className="rv-card__title">Demande de réservation</h2>
                <p className="rv-card__sub">Un message WhatsApp sera préparé automatiquement.</p>
              </div>
            </div>

            <div className="rv-form">

            {/* Full name */}
            <div className="rv-field">
              <label className="rv-field__label">Nom complet <span className="rv-req">*</span></label>
              <div className="rv-field__wrap">
                <span className="rv-field__ico"><IcoUser /></span>
                <input
                  type="text"
                  className="rv-input"
                  placeholder="Mohammed Alami"
                  value={form.fullName}
                  onChange={set('fullName')}
                  autoFocus
                />
              </div>
            </div>

            {/* Lieu */}
            <div className="rv-field">
              <label className="rv-field__label">Lieu de prise en charge <span className="rv-req">*</span></label>
              <div className="rv-field__wrap">
                <span className="rv-field__ico"><IcoPin /></span>
                <select
                  className={`rv-input rv-select ${!form.lieu ? 'rv-select--placeholder' : ''}`}
                  value={form.lieu}
                  onChange={set('lieu')}
                >
                  <option value="" disabled>Choisissez une ville…</option>
                  {moroccanCities.map(city => <option key={city} value={city}>{city}</option>)}
                </select>
              </div>
            </div>

            {/* Dates */}
            <div className="rv-dates">
              <div className="rv-field">
                <label className="rv-field__label">
                  <IcoCalStart /> Départ <span className="rv-req">*</span>
                </label>
                <DatePicker
                  value={form.depart}
                  onChange={v => setForm(f => ({ ...f, depart: v }))}
                  placeholder="JJ-MMM-AAAA"
                  className="rv-datepicker"
                />
              </div>
              <div className="rv-field">
                <label className="rv-field__label">
                  <IcoCalEnd /> Retour <span className="rv-req">*</span>
                </label>
                <DatePicker
                  value={form.retour}
                  onChange={v => setForm(f => ({ ...f, retour: v }))}
                  min={form.depart ? addDays(form.depart, minDays) : undefined}
                  highlight={form.depart || undefined}
                  placeholder="JJ-MMM-AAAA"
                  className="rv-datepicker"
                />
              </div>
            </div>

            {/* Summary */}
            {days && (
              <div className="rv-summary">
                <div className="rv-summary__row">
                  <span className="rv-summary__label"><IcoClock /> Durée de location</span>
                  <span className="rv-summary__val">{days} jour{days > 1 ? 's' : ''}</span>
                </div>
                {promoPrice && (
                  <>
                    <div className="rv-summary__row">
                      <span className="rv-summary__label"><IcoTag /> {formatMoney(promoPrice, currency)} × {days}</span>
                      {promoLabel && (
                        <span className="rv-summary__val rv-summary__val--muted">
                          <s>{formatMoney(Number(prix) * days, currency)}</s>
                        </span>
                      )}
                    </div>
                    <div className="rv-summary__total">
                      <span>Total estimé</span>
                      <strong>{formatMoney(promoPrice * days, currency)}</strong>
                    </div>
                  </>
                )}
              </div>
            )}

            {error && (
              <p className="rv-error">
                <IcoAlert /> {error}
              </p>
            )}

            <button className="rv-wa-btn" onClick={handleWhatsApp}>
              <IcoWhatsApp />
              Envoyer via WhatsApp
            </button>

            {/* Guarantees */}
            <div className="rv-guarantees">
              <div className="rv-guarantee"><span className="rv-guarantee__ico"><IcoShield /></span> Assurance incluse</div>
              <div className="rv-guarantee"><span className="rv-guarantee__ico"><IcoRefresh /></span> Annulation gratuite</div>
              <div className="rv-guarantee"><span className="rv-guarantee__ico"><IcoGauge /></span> Km illimité</div>
            </div>

            </div>
            </>
            )}
          </div>
        </section>

      </div>
    </div>
  )
}
