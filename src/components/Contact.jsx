import { useRef, useState } from 'react'
import Icon from './Icon'
import SocialIcon from './SocialIcon'
import { SectionTitle } from './SectionHead'
import { useScrollReveal } from '../hooks/useScrollReveal'
import { useSettings } from '../lib/SettingsContext'
import { formatPhone, waLink } from '../lib/contact'
import './contact.css'

const subjects = ['Demande de réservation', 'Renseignement sur la flotte', 'Tarifs entreprise', 'Réclamation', 'Autre']

const REQUIRED = { prenom: 'Entrez votre prénom', nom: 'Entrez votre nom', email: 'Entrez votre email' }

function validate(form) {
  const errors = {}
  for (const [key, message] of Object.entries(REQUIRED)) if (!form[key].trim()) errors[key] = message
  if (!errors.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Cet email semble incomplet'
  return errors
}

// Label, control and error message, tied together for screen readers.
function Field({ id, label, error, required, as: Tag = 'input', children, ...props }) {
  return (
    <div className={`form-group ${error ? 'has-error' : ''}`}>
      <label htmlFor={`contact-${id}`}>
        {label} {required && <span className="form-req" aria-hidden="true">*</span>}
      </label>
      <Tag
        id={`contact-${id}`}
        name={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `contact-${id}-error` : undefined}
        {...props}
      >
        {children}
      </Tag>
      {error && <span className="form-error" id={`contact-${id}-error`} role="alert">{error}</span>}
    </div>
  )
}

/* Built from the admin settings, and each block is dropped when its value is blank:
   the site never invents an address, a number or an email. */
function ContactList({ settings }) {
  const { address, phone, whatsapp, contactEmail } = settings
  return (
    <ul className="contact__list">
      {address && (
        <li>
          <span className="contact__icon"><Icon name="pin" /></span>
          <div><strong>Adresse</strong><p>{address}</p></div>
        </li>
      )}
      {(phone || whatsapp) && (
        <li>
          <span className="contact__icon"><Icon name="phone" /></span>
          <div>
            <strong>Téléphone</strong>
            {phone && <a href={`tel:+${phone}`}>{formatPhone(phone)}</a>}
            {whatsapp && (
              <a href={waLink(whatsapp, 'Bonjour YASSIR CARS, je souhaite des informations.')} target="_blank" rel="noopener noreferrer">
                {formatPhone(whatsapp)} (WhatsApp)
              </a>
            )}
          </div>
        </li>
      )}
      {contactEmail && (
        <li>
          <span className="contact__icon"><Icon name="mail" /></span>
          <div><strong>Email</strong><a href={`mailto:${contactEmail}`}>{contactEmail}</a></div>
        </li>
      )}
      <li>
        <span className="contact__icon"><Icon name="clock" /></span>
        <div>
          <strong>Horaires</strong>
          <p>Lun – sam : 8h – 20h</p>
          <p>Dimanche : 9h – 18h</p>
        </div>
      </li>
    </ul>
  )
}

export default function Contact({ onSubmit }) {
  const { settings, reload } = useSettings()
  const [error, setError] = useState('')
  const cardRef = useScrollReveal()

  const socialLinks = [
    { key: 'facebook',  label: 'Facebook',  url: settings.facebookUrl },
    { key: 'instagram', label: 'Instagram', url: settings.instagramUrl },
    { key: 'tiktok',    label: 'TikTok',    url: settings.tiktokUrl },
    { key: 'whatsapp',  label: 'WhatsApp',  url: settings.whatsapp ? `https://wa.me/${settings.whatsapp}` : '' },
  ].filter(s => s.url)
  const [form, setForm] = useState({ prenom: '', nom: '', email: '', tel: '', sujet: subjects[0], message: '' })

  const [errors, setErrors] = useState({})
  const formRef = useRef(null)

  const set = (key) => (e) => {
    setForm(f => ({ ...f, [key]: e.target.value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }))
  }
  // Everything a field needs but its label.
  const field = (key) => ({ id: key, value: form[key], onChange: set(key), error: errors[key], required: key in REQUIRED })

  const handleSubmit = (e) => {
    e.preventDefault()
    // Before WhatsApp opens, not after.
    const found = validate(form)
    setErrors(found)
    const first = Object.keys(found)[0]
    if (first) return formRef.current.elements[first].focus()
    if (!settings.whatsapp) {
      reload()
      return setError('Envoi momentanément impossible. Vérifiez votre connexion et réessayez.')
    }
    setError('')
    // This form used to only pop a toast — nothing was sent anywhere and every
    // enquiry was lost. It now hands the message to WhatsApp, the same channel
    // the rest of the site books through.
    const text = [
      `Bonjour YASSIR CARS`,
      ``,
      `Sujet : ${form.sujet}`,
      `Nom : ${form.prenom} ${form.nom}`.trim(),
      `Email : ${form.email}`,
      form.tel ? `Téléphone : ${form.tel}` : '',
      ``,
      form.message,
    ].filter(Boolean).join('\n')

    const url = waLink(settings.whatsapp, text)
    // No 'noopener' in the features: with it window.open returns null even when
    // the tab opened, so the fallback below always ran and WhatsApp opened twice.
    // The opener is cut by hand instead.
    const win = window.open(url, '_blank')
    if (win) win.opener = null
    // Popup blocked (common on iOS Safari) — navigate this tab instead so the
    // message still reaches the agency rather than silently disappearing.
    else window.location.href = url

    onSubmit('Votre message a été préparé dans WhatsApp — envoyez-le pour nous joindre.')
    setForm({ prenom: '', nom: '', email: '', tel: '', sujet: subjects[0], message: '' })
  }

  return (
    <section className="section contact" id="contact">
      <div className="container">
        <div className="contact__card" ref={cardRef}>
          <div className="contact__side">
            <SectionTitle>Nous sommes à votre écoute</SectionTitle>
            <p>Une question, une demande spéciale ? Notre équipe vous répond rapidement.</p>
            <ContactList settings={settings} />
            {socialLinks.length > 0 && (
              <div className="contact__socials">
                {socialLinks.map(s => (
                  <a href={s.url} key={s.key} aria-label={s.label} title={s.label} target="_blank" rel="noopener noreferrer">
                    <SocialIcon name={s.key} />
                  </a>
                ))}
              </div>
            )}
          </div>

          <form className="contact-form" onSubmit={handleSubmit} ref={formRef} noValidate>
            <div className="form-row-2">
              <Field {...field('prenom')} label="Prénom" type="text" placeholder="Votre prénom" autoComplete="given-name" />
              <Field {...field('nom')} label="Nom" type="text" placeholder="Votre nom" autoComplete="family-name" />
              <Field {...field('email')} label="Email" type="email" inputMode="email" placeholder="votre@email.com" autoComplete="email" />
              <Field {...field('tel')} label="Téléphone" type="tel" inputMode="tel" placeholder="+212 6XX XXX XXX" autoComplete="tel" />
            </div>
            <Field {...field('sujet')} label="Sujet" as="select">
              {subjects.map(s => <option key={s}>{s}</option>)}
            </Field>
            <Field {...field('message')} label="Message" as="textarea" rows={5} placeholder="Décrivez votre besoin…" />
            {error && <p className="contact-form__error" role="alert">{error}</p>}
            <button type="submit" className="btn btn-wa btn-lg btn-full">
              <SocialIcon name="whatsapp" /> Envoyer via WhatsApp
            </button>
            <p className="contact-form__note">
              Votre message s’ouvrira dans WhatsApp, il ne part qu’une fois que vous l’envoyez.
            </p>
          </form>
        </div>
      </div>
    </section>
  )
}
