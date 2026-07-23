import { useState } from 'react'
import Icon from './Icon'
import SocialIcon from './SocialIcon'
import { useSettings } from '../lib/SettingsContext'
import { formatPhone, waLink } from '../lib/contact'

const subjects = ['Demande de réservation', 'Renseignement sur la flotte', 'Tarifs entreprise', 'Réclamation', 'Autre']

export default function Contact({ onSubmit }) {
  const { settings } = useSettings()

  // Built from the admin settings, and each block is dropped when its value is
  // blank — the site never invents an address, a number or an email.
  const contactItems = [
    settings.address && {
      icon: 'pin', title: 'Adresse', lines: [settings.address],
    },
    (settings.phone || settings.whatsapp) && {
      icon: 'phone', title: 'Téléphone', lines: [
        settings.phone && formatPhone(settings.phone),
        settings.whatsapp && `${formatPhone(settings.whatsapp)} (WhatsApp)`,
      ].filter(Boolean),
    },
    settings.contactEmail && {
      icon: 'mail', title: 'Email', lines: [settings.contactEmail],
    },
    {
      icon: 'clock', title: "Horaires d'ouverture",
      lines: ['Lun – Sam : 8h00 – 20h00', 'Dimanche : 9h00 – 18h00'],
    },
  ].filter(Boolean)
  const socialLinks = [
    { key: 'facebook',  label: 'Facebook',  url: settings.facebookUrl },
    { key: 'instagram', label: 'Instagram', url: settings.instagramUrl },
    { key: 'tiktok',    label: 'TikTok',    url: settings.tiktokUrl },
    { key: 'whatsapp',  label: 'WhatsApp',  url: settings.whatsapp ? `https://wa.me/${settings.whatsapp}` : '' },
  ].filter(s => s.url)
  const [form, setForm] = useState({ prenom: '', nom: '', email: '', tel: '', sujet: subjects[0], message: '' })

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
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
    const win = window.open(url, '_blank', 'noopener,noreferrer')
    // Popup blocked (common on iOS Safari) — navigate this tab instead so the
    // message still reaches the agency rather than silently disappearing.
    if (!win) window.location.href = url

    onSubmit('Votre message a été préparé dans WhatsApp — envoyez-le pour nous joindre.')
    setForm({ prenom: '', nom: '', email: '', tel: '', sujet: subjects[0], message: '' })
  }

  return (
    <section className="section" id="contact">
      <div className="container">
        <div className="section-header">
          <div className="section-badge">Contactez-nous</div>
          <h2 className="section-title">Nous sommes à votre écoute</h2>
          <p className="section-subtitle">Une question, une demande spéciale ? Notre équipe vous répond rapidement.</p>
        </div>

        <div className="contact-grid">
          <div className="contact-info">
            {contactItems.map(item => (
              <div className="contact-item" key={item.title}>
                <div className="contact-icon"><Icon name={item.icon} /></div>
                <div>
                  <strong>{item.title}</strong>
                  {item.lines.map(l => <p key={l}>{l}</p>)}
                </div>
              </div>
            ))}
            <div className="social-links">
              {socialLinks.map(s => (
                <a href={s.url} key={s.key} className="social-btn" aria-label={s.label} title={s.label} target="_blank" rel="noopener noreferrer">
                  <SocialIcon name={s.key} /> {s.label}
                </a>
              ))}
            </div>
          </div>

          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="form-row-2">
              <div className="form-group">
                <label>Prénom</label>
                <input type="text" placeholder="Votre prénom" value={form.prenom} onChange={set('prenom')} required />
              </div>
              <div className="form-group">
                <label>Nom</label>
                <input type="text" placeholder="Votre nom" value={form.nom} onChange={set('nom')} required />
              </div>
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" placeholder="votre@email.com" value={form.email} onChange={set('email')} required />
            </div>
            <div className="form-group">
              <label>Téléphone</label>
              <input type="tel" placeholder="+212 6XX XXX XXX" value={form.tel} onChange={set('tel')} />
            </div>
            <div className="form-group">
              <label>Sujet</label>
              <select value={form.sujet} onChange={set('sujet')}>
                {subjects.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Message</label>
              <textarea rows={5} placeholder="Décrivez votre besoin..." value={form.message} onChange={set('message')} />
            </div>
            <button type="submit" className="btn btn-primary btn-lg btn-full">
              <SocialIcon name="whatsapp" /> Envoyer via WhatsApp
            </button>
            <p className="contact-form__note">
              Votre message s’ouvrira dans WhatsApp — il ne part qu’une fois que vous l’envoyez.
            </p>
          </form>
        </div>
      </div>
    </section>
  )
}
