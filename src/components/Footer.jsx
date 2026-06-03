import Logo from './Logo'

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
              {['f', 'ig', 'yt', 'in'].map(s => <a href="#" key={s} aria-label={s}>{s}</a>)}
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
          <p>Conçu avec ❤️ au Maroc</p>
        </div>
      </div>
    </footer>
  )
}
