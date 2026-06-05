import { useState } from 'react'
import Icon from './Icon'

const subjects = ['Demande de réservation', 'Renseignement sur la flotte', 'Tarifs entreprise', 'Réclamation', 'Autre']

const contactItems = [
  { icon: 'pin', title: 'Siège social', lines: ['123 Boulevard Mohammed V', 'Casablanca 20000, Maroc'] },
  { icon: 'phone', title: 'Téléphone', lines: ['+212 522 000 000', '+212 661 000 000 (WhatsApp)'] },
  { icon: 'mail', title: 'Email', lines: ['contact@yassir-cars.ma', 'reservation@yassir-cars.ma'] },
  { icon: 'clock', title: "Horaires d'ouverture", lines: ['Lun – Sam : 8h00 – 20h00', 'Dimanche : 9h00 – 18h00'] },
]

export default function Contact({ onSubmit }) {
  const [form, setForm] = useState({ prenom: '', nom: '', email: '', tel: '', sujet: subjects[0], message: '' })

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit('Message envoyé ! Nous vous répondrons dans les 24h.')
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
              {['Facebook', 'Instagram', 'WhatsApp'].map(s => (
                <a href="#" key={s} className="social-btn">{s}</a>
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
              Envoyer le message →
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
