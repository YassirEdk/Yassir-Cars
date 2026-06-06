import Logo from './Logo'
import Icon from './Icon'
import { useSettings } from '../lib/SettingsContext'

const cols = [
  {
    title: 'Nos Services',
    links: ['Location courte durée', 'Location longue durée', 'Navette aéroport', 'Chauffeur privé', 'Location minibus', "Voyage d'affaires"],
  },
  {
    title: 'Nos Agences',
    links: ['Casablanca', 'Rabat', 'Marrakech', 'Agadir', 'Fès', 'Tanger'],
  },
  {
    title: 'Informations',
    links: ['À propos de nous', 'Conditions générales', 'Politique de confidentialité', 'FAQ', 'Blog', 'Carrières'],
  },
]

export default function Footer() {
  const { settings } = useSettings()
  // Only show a social link when its URL is configured in the admin settings.
  const socials = [
    { key: 'f',  label: 'Facebook',  url: settings.facebookUrl },
    { key: 'ig', label: 'Instagram', url: settings.instagramUrl },
  ].filter(s => s.url)

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <a href="#accueil" style={{ textDecoration: 'none', display: 'inline-flex', marginBottom: 20 }}>
              <Logo size={38} animated={false} />
            </a>
            <p>Votre partenaire de confiance pour la location de véhicules au Maroc depuis 2014. Qualité, transparence et satisfaction garanties.</p>
            <div className="footer-socials">
              {socials.map(s => (
                <a href={s.url} key={s.key} aria-label={s.label} target="_blank" rel="noopener noreferrer">{s.key}</a>
              ))}
            </div>
          </div>

          {cols.map(col => (
            <div className="footer-col" key={col.title}>
              <h4>{col.title}</h4>
              <ul>
                {col.links.map(l => <li key={l}><a href="#">{l}</a></li>)}
              </ul>
            </div>
          ))}
        </div>

        <div className="footer-bottom">
          <p>© 2026 YASSIR CARS. Tous droits réservés.</p>
          <p className="footer-made">Conçu avec <Icon name="heart" /> au Maroc</p>
        </div>
      </div>
    </footer>
  )
}
