import { Link, useLocation } from 'react-router-dom'
import Logo from './Logo'
import Icon from './Icon'
import SocialIcon from './SocialIcon'
import { useSettings } from '../lib/SettingsContext'
import { formatPhone, waLink } from '../lib/contact'
import './footer.css'

/* Every link leads somewhere real. Conditions générales, confidentialité and FAQ
   belong in "Informations" as soon as those pages exist. */
const cols = [
  {
    title: 'Nos services',
    links: ['Location courte durée', 'Location longue durée', 'Navette aéroport', 'Chauffeur privé', 'Location minibus', "Voyage d'affaires"]
      .map(label => ({ label, section: 'services' })),
  },
  {
    title: 'Louer à',
    links: ['Casablanca', 'Rabat', 'Marrakech', 'Agadir', 'Fès', 'Tanger']
      .map(city => ({ label: city, to: `/resultats?lieu=${encodeURIComponent(city)}` })),
  },
  {
    title: 'Informations',
    links: [
      { label: 'Notre flotte', to: '/flotte' },
      { label: 'Comment ça marche', section: 'comment' },
      { label: 'Avis clients', section: 'avis' },
      { label: 'Nous contacter', section: 'contact' },
    ],
  },
]

// On the home page the link scrolls; from another page it goes there first.
function FooterLink({ label, to, section }) {
  const onHome = useLocation().pathname === '/'
  if (to) return <Link to={to}>{label}</Link>
  if (onHome) return <a href={`#${section}`}>{label}</a>
  return <Link to="/" state={{ scrollToId: section }}>{label}</Link>
}

export default function Footer() {
  const { settings } = useSettings()
  // Only show a social link when its URL is configured in the admin settings.
  const socials = [
    { key: 'facebook',  label: 'Facebook',  url: settings.facebookUrl },
    { key: 'instagram', label: 'Instagram', url: settings.instagramUrl },
    { key: 'tiktok',    label: 'TikTok',    url: settings.tiktokUrl },
    { key: 'whatsapp',  label: 'WhatsApp',  url: settings.whatsapp ? `https://wa.me/${settings.whatsapp}` : '' },
  ].filter(s => s.url)

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <FooterLink section="accueil" label={<Logo size={38} />} />
            <p>Votre partenaire de confiance pour la location de véhicules au Maroc depuis 2014. Qualité, transparence et satisfaction garanties.</p>
            <ul className="footer-contact">
              {settings.phone && (
                <li><a href={`tel:+${settings.phone}`}><Icon name="phone" /> {formatPhone(settings.phone)}</a></li>
              )}
              {settings.whatsapp && (
                <li>
                  <a href={waLink(settings.whatsapp, 'Bonjour YASSIR CARS, je souhaite des informations.')} target="_blank" rel="noopener noreferrer">
                    <SocialIcon name="whatsapp" /> {formatPhone(settings.whatsapp)}
                  </a>
                </li>
              )}
              <li><span><Icon name="clock" /> Lun – sam 8h – 20h, dim. 9h – 18h</span></li>
            </ul>
          </div>

          {cols.map(col => (
            <div className="footer-col" key={col.title}>
              <h3>{col.title}</h3>
              <ul>
                {col.links.map(l => <li key={l.label}><FooterLink {...l} /></li>)}
              </ul>
            </div>
          ))}
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} YASSIR CARS. Tous droits réservés.</p>
          {socials.length > 0 && (
            <div className="footer-socials">
              {socials.map(s => (
                <a href={s.url} key={s.key} aria-label={s.label} title={s.label} target="_blank" rel="noopener noreferrer">
                  <SocialIcon name={s.key} />
                </a>
              ))}
            </div>
          )}
          <p className="footer-made">Conçu avec <Icon name="heart" /> au Maroc</p>
        </div>
      </div>
    </footer>
  )
}
