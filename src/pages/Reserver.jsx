import { useState, useMemo, useEffect, useRef } from 'react'
import { useSearchParams, useLocation, Link } from 'react-router-dom'
import Logo from '../components/Logo'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import SplitNotice, { Back, Onward } from '../components/SplitNotice'
import DatePicker from '../components/DatePicker'
import FeaturePills from '../components/FeaturePills'
import PhotoRail from '../components/PhotoRail'
import PlaceOptions from '../components/PlaceOptions'
import Icon from '../components/Icon'
import SocialIcon from '../components/SocialIcon'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { addDays, colorName, categoryLabel } from '../data'
import { useSettings } from '../lib/SettingsContext'
import { useCurrency } from '../lib/CurrencyContext'
import { formatMoney } from '../lib/currency'
import { fetchCars, mergeByModel, isCarAvailable, unitForColor } from '../lib/cars'
import { bookingDays, bookingErrors, bookingMessage, focusField, jours } from '../lib/booking'
import { waLink } from '../lib/contact'
import { discounted, discountLabel, rateForCar } from '../lib/pricing'
import './reserver.css'

/* Opened without a car (a bookmark, a typed address): there is nothing to book yet. */
function NothingToBook() {
  return (
    <>
      <Navbar minimal />
      <SplitNotice
        title="Aucune voiture sélectionnée"
        tagline="Choisissez d’abord une voiture et vos dates."
        message="Vous retrouverez ensuite cette page avec votre demande, prête à envoyer."
      >
        <Link to="/flotte" className="error-btn error-btn--primary"><Onward>Choisir une voiture</Onward></Link>
        <Link to="/" className="error-btn error-btn--ghost"><Back>Retour à l’accueil</Back></Link>
      </SplitNotice>
      <Footer />
    </>
  )
}

// Label, control and error message of one field. `data-field`: see focusField().
function Field({ name, label, icon, required = false, error, htmlFor, children }) {
  const Label = htmlFor ? 'label' : 'span'
  return (
    <div className={`rv-field ${error ? 'has-error' : ''}`} data-field={name}>
      <Label className="rv-field__label" htmlFor={htmlFor}>
        {label}{required && <span className="rv-req" aria-hidden="true">*</span>}
      </Label>
      <div className="rv-field__wrap">
        {icon && <Icon name={icon} className="rv-field__ico" />}
        {children}
      </div>
      {error && <span className="rv-field__error" role="alert">{error}</span>}
    </div>
  )
}

export default function Reserver() {
  const [params] = useSearchParams()
  const location = useLocation()
  const { settings, reload } = useSettings()
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

  // No car was carried in: a real reservation can't be built.
  const hasCar = Boolean(data.nom)
  const carName = data.nom || 'Véhicule'
  const carColor = data.couleur || ''
  useDocumentTitle(hasCar ? `Réserver ${carName} | YASSIR CARS` : undefined)

  const [form, setForm] = useState({
    fullName: '',
    lieu: data.lieu || '',
    lieuRetour: data.lieuRetour || '',   // '' = back where it was picked up
    depart: data.depart || '',
    retour: data.retour || '',
  })
  const [errors, setErrors] = useState({})     // by field
  const [error, setError] = useState('')       // about the sending itself
  const formRef = useRef(null)

  // Keeps what was typed, and drops the errors of the fields it touches.
  const update = (patch) => {
    setForm(f => ({ ...f, ...patch }))
    setErrors(prev => Object.fromEntries(Object.entries(prev).filter(([key]) => !(key in patch))))
  }

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
      if (form.lieuRetour) p.set('lieuRetour', form.lieuRetour)
      if (form.depart) p.set('depart', form.depart)
      if (form.retour) p.set('retour', form.retour)
      const qs = p.toString()
      return { href: qs ? `/resultats?${qs}` : '/resultats', to: 'aux résultats' }
    }
    if (origin === '/flotte') return { href: '/flotte', to: 'à la flotte' }
    return { href: '/', to: 'à l’accueil' }
  }, [data.from, form.lieu, form.lieuRetour, form.depart, form.retour])

  // Set once the request has been handed off to WhatsApp. Holds the wa.me URL so
  // the confirmation panel can offer it again when the popup was blocked.
  const [sent, setSent] = useState(null)   // { url, text }
  const [copied, setCopied] = useState(false)

  /* The car as it is in the fleet now. The details carried in (router state, or
     an old link) say nothing about bookings, so they can't answer "is it free?".
     fleet: null while loading, then the merged models. */
  const [fleet, setFleet] = useState(null)
  useEffect(() => {
    let alive = true
    fetchCars()
      .then(list => { if (alive) setFleet(mergeByModel(list)) })
      .catch(() => { if (alive) setFleet([]) })
    return () => { alive = false }
  }, [])

  const unit = useMemo(() => {
    if (!fleet) return null
    // By id when there is one; old ?query= links only carry the model name.
    if (data.carId) {
      const model = fleet.find(m => m.units.some(u => String(u.id) === String(data.carId)))
      const picked = model?.units.find(u => String(u.id) === String(data.carId))
      return picked ? unitForColor(model, picked.color, form.depart, form.retour) : null
    }
    const name = String(data.nom || '').trim().toLowerCase()
    const model = fleet.find(m => m.name.trim().toLowerCase() === name)
    if (!model) return null
    const named = model.colors.find(hex => colorName(hex) === data.couleur)
    return named
      ? unitForColor(model, named, form.depart, form.retour)
      : model.units.find(u => isCarAvailable(u, form.depart, form.retour)) ?? model.units[0]
  }, [fleet, data, form.depart, form.retour])

  const checking = fleet === null
  // A car that can't be found (fleet unreachable) isn't reported as taken: the
  // agency confirms every request anyway.
  const taken = Boolean(unit) && !isCarAvailable(unit, form.depart, form.retour)

  // Carried in, or the fleet's own when the link only named the car.
  const gallery = useMemo(() => {
    const carried = Array.isArray(data.photos) && data.photos.length ? data.photos : [data.photo].filter(Boolean)
    return carried.length ? carried : (unit?.photos ?? [])
  }, [data.photos, data.photo, unit])
  const features = data.features?.length ? data.features : (unit?.features ?? [])
  const specs = unit
    ?? (data.seats ? { category: data.categorie, fuel: data.fuel, transmission: data.transmission, seats: data.seats } : null)

  const prix = Number(unit?.price ?? data.prix ?? 0)
  // Resolve the promotion from the car id carried in, so this page can't show a
  // discount the car no longer has.
  const rate = rateForCar(unit?.id ?? data.carId, settings)
  const dayPrice = prix ? discounted(prix, rate) : 0
  const promoLabel = prix ? discountLabel(rate) : null
  const days = bookingDays(form.depart, form.retour)
  const total = days ? dayPrice * days : 0

  const handleWhatsApp = (e) => {
    e?.preventDefault()
    setError('')
    const found = bookingErrors(form, minDays)
    setErrors(found)
    if (Object.keys(found).length) return focusField(formRef.current, found)
    if (checking || taken) return
    if (!settings.whatsapp) {
      reload()
      return setError('Envoi momentanément impossible. Vérifiez votre connexion et réessayez.')
    }

    const text = bookingMessage({ carName, color: carColor, form, dayPrice, currency })
    const url = waLink(settings.whatsapp, text)
    // window.open can be swallowed (iOS Safari, popup blockers). Show the
    // confirmation panel either way — it carries the link as a fallback so the
    // customer is never left thinking the request went through when it didn't.
    window.open(url, '_blank', 'noopener,noreferrer')
    setSent({ url, text })
    setCopied(false)
    window.scrollTo(0, 0)
  }

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(sent.text)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  /* Phones: the total and the button stay within reach while the button itself is
     further down the form. */
  const submitRef = useRef(null)
  const [submitSeen, setSubmitSeen] = useState(true)
  useEffect(() => {
    if (!submitRef.current) return
    const observer = new IntersectionObserver(([entry]) => setSubmitSeen(entry.isIntersecting))
    observer.observe(submitRef.current)
    return () => observer.disconnect()
  }, [hasCar, sent])

  if (!hasCar) return <NothingToBook />

  const submitLabel = checking ? 'Vérification…' : taken ? 'Non disponible' : 'Envoyer via WhatsApp'

  return (
    <div className="rv-page">
      <header className="rv-topbar">
        <Link to="/" className="rv-topbar__logo" aria-label="YASSIR CARS, accueil"><Logo size={36} /></Link>
        <Link to={back.href} className="back-btn">
          <span className="back-btn__arrow"><Icon name="arrowLeft" size={15} /></span>
          <span>Retour<span className="back-btn__long"> {back.to}</span></span>
        </Link>
      </header>

      <main className="rv-split">

        {/* ── The car ── */}
        <section className="rv-car" aria-label="La voiture">
          <div className="rv-car__inner">
            <div className="rv-car__frame stage">
              <PhotoRail
                key={gallery.join('|')}
                photos={gallery}
                eager
                alt={`${carName}${carColor ? ` ${carColor.toLowerCase()}` : ''}`}
                fallback={<div className="rv-car__none"><Icon name="car" /></div>}
              />
            </div>

            <div className="rv-car__head">
              <div>
                <h1 className="rv-car__name">{carName}</h1>
                {/* Not known yet: the place is kept, here and below. */}
                <p className="rv-car__cat">{[specs && categoryLabel(specs.category), carColor].filter(Boolean).join(' · ') || '\u00a0'}</p>
              </div>
              {dayPrice > 0 ? (
                <p className="rv-car__price">
                  {promoLabel && (
                    <span className="rv-car__old"><s>{formatMoney(prix, currency)}</s> <span>{promoLabel}</span></span>
                  )}
                  <strong>{formatMoney(dayPrice, currency)}</strong> <span>par jour</span>
                </p>
              ) : checking && <p className="rv-car__price" aria-hidden="true"><strong>&nbsp;</strong><span>&nbsp;</span></p>}
            </div>

            {specs ? (
              <ul className="rv-car__specs">
                <li><Icon name="fuel" /> {specs.fuel}</li>
                <li><Icon name="gear" /> {specs.transmission}</li>
                <li><Icon name="users" /> {specs.seats} places</li>
              </ul>
            ) : checking && <p className="rv-car__specs" aria-hidden="true">&nbsp;</p>}
            {checking && !features.length && <p className="rv-car__equip" aria-hidden="true"><span className="rv-equip-pill">&nbsp;</span></p>}
            <FeaturePills features={features} className="rv-car__equip" pillClass="rv-equip-pill" limit={6} mobileLimit={3} short />
          </div>
        </section>

        {/* ── The request ── */}
        <section className="rv-side">
          <div className="rv-card">
            {sent ? (
              /* What left, and a way through if the WhatsApp tab was blocked. */
              <div className="rv-sent">
                <span className="rv-sent__icon"><Icon name="check" /></span>
                <h2 className="rv-sent__title">Demande préparée</h2>
                <p className="rv-sent__sub">
                  Votre demande pour la <strong>{carName}</strong> est prête dans WhatsApp.
                  Envoyez le message pour la confirmer : l’agence vous répond en général sous 1&nbsp;heure.
                </p>

                <pre className="rv-sent__msg">{sent.text}</pre>

                <a href={sent.url} target="_blank" rel="noopener noreferrer" className="btn btn-wa btn-lg btn-full">
                  <SocialIcon name="whatsapp" /> Ouvrir WhatsApp
                </a>

                <div className="rv-sent__actions">
                  <button type="button" className="rv-sent__btn" onClick={copyMessage}>
                    <Icon name={copied ? 'check' : 'clipboard'} /> {copied ? 'Message copié' : 'Copier le message'}
                  </button>
                  <button type="button" className="rv-sent__btn" onClick={() => setSent(null)}>Modifier ma demande</button>
                </div>

                <Link to={back.href} className="rv-sent__link"><Icon name="arrowLeft" /> Retour {back.to}</Link>
              </div>
            ) : (
              <form className="rv-form" onSubmit={handleWhatsApp} ref={formRef} noValidate>
                <header className="rv-form__head">
                  <h2 className="rv-form__title">Demande de réservation</h2>
                  <p>Vous relisez le message dans WhatsApp avant de l’envoyer.</p>
                </header>

                <Field name="fullName" label="Nom complet" required error={errors.fullName} htmlFor="rv-name">
                  <input
                    id="rv-name"
                    type="text"
                    autoComplete="name"
                    className="rv-input"
                    placeholder="Mohammed Alami"
                    value={form.fullName}
                    onChange={e => update({ fullName: e.target.value })}
                    aria-invalid={errors.fullName ? true : undefined}
                  />
                </Field>

                <Field name="lieu" label="Lieu de prise en charge" icon="pin" required error={errors.lieu} htmlFor="rv-lieu">
                  <select
                    id="rv-lieu"
                    className={`rv-input rv-select ${form.lieu ? '' : 'is-placeholder'}`}
                    value={form.lieu}
                    onChange={e => update({ lieu: e.target.value })}
                    aria-invalid={errors.lieu ? true : undefined}
                  >
                    <option value="" disabled>Ville ou aéroport…</option>
                    <PlaceOptions />
                  </select>
                </Field>

                <Field name="lieuRetour" label="Lieu de retour" icon="pin" htmlFor="rv-lieu-retour">
                  <select id="rv-lieu-retour" className="rv-input rv-select" value={form.lieuRetour}
                    onChange={e => update({ lieuRetour: e.target.value })}>
                    <option value="">Même agence qu’au départ</option>
                    <PlaceOptions />
                  </select>
                </Field>

                <div className="rv-dates">
                  <Field name="depart" label="Départ" required error={errors.depart}>
                    <DatePicker
                      value={form.depart}
                      onChange={depart => update(
                        // Too short (or backwards) with the new start: ask for the return again.
                        form.retour && form.retour < addDays(depart, minDays) ? { depart, retour: '' } : { depart },
                      )}
                      ariaLabel="Date de départ"
                      placeholder="Choisir une date"
                      className="rv-input"
                      friendly
                      flip
                    />
                  </Field>
                  <Field name="retour" label="Retour" required error={errors.retour}>
                    <DatePicker
                      value={form.retour}
                      onChange={retour => update({ retour })}
                      min={form.depart ? addDays(form.depart, minDays) : undefined}
                      highlight={form.depart || undefined}
                      ariaLabel="Date de retour"
                      placeholder="Choisir une date"
                      className="rv-input"
                      friendly
                      flip
                    />
                  </Field>
                </div>

                {total > 0 && (
                  <dl className="rv-total">
                    <div><dt>{formatMoney(prix, currency)} × {jours(days)}</dt><dd>{formatMoney(prix * days, currency)}</dd></div>
                    {promoLabel && (
                      <div className="rv-total__save"><dt>Remise {promoLabel}</dt><dd>− {formatMoney((prix - dayPrice) * days, currency)}</dd></div>
                    )}
                    <div className="rv-total__sum"><dt>Total estimé</dt><dd>{formatMoney(total, currency)}</dd></div>
                  </dl>
                )}

                {checking && !total && days && <div className="rv-total rv-total--wait" />}

                {taken && (
                  <p className="rv-alert" role="alert">
                    <Icon name="calendarX" /> Ce véhicule est déjà réservé pour ces dates. Choisissez d’autres dates ou un autre véhicule.
                  </p>
                )}
                {error && <p className="rv-alert" role="alert">{error}</p>}

                <button type="submit" className="btn btn-wa btn-lg btn-full" ref={submitRef} disabled={checking || taken}>
                  {!checking && !taken && <SocialIcon name="whatsapp" />} {submitLabel}
                </button>

                <ul className="rv-trust">
                  <li><Icon name="shield" /> Assurance incluse</li>
                  <li><Icon name="checkCircle" /> Annulation gratuite</li>
                  <li><Icon name="road" /> Km illimité</li>
                </ul>
              </form>
            )}
          </div>
        </section>
      </main>

      {!sent && (
        <div className={`rv-dock ${submitSeen ? '' : 'is-shown'}`} inert={submitSeen ? '' : undefined}>
          {total > 0 && (
            <p className="rv-dock__total"><span>Total · {jours(days)}</span><strong>{formatMoney(total, currency)}</strong></p>
          )}
          <button type="button" className="btn btn-wa" onClick={handleWhatsApp} disabled={checking || taken}>
            {!checking && !taken && <SocialIcon name="whatsapp" />} {taken ? 'Non disponible' : checking ? 'Vérification…' : 'Envoyer'}
          </button>
        </div>
      )}
    </div>
  )
}
