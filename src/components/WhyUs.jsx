import Icon, { MoroccoFlag } from './Icon'

const features = [
  { icon: 'checkCircle', title: 'Tarifs transparents', desc: 'Aucun frais caché. Le prix affiché est le prix que vous payez.' },
  { icon: 'lock', title: 'Assurance complète', desc: 'Tous nos véhicules sont couverts tous risques avec assistance.' },
  { icon: 'phone', title: 'Support 24h/24 - 7j/7', desc: 'Une équipe dédiée disponible à tout moment pour vous aider.' },
  { icon: 'globe', title: '15 agences au Maroc', desc: 'Présents dans les principales villes et aéroports du royaume.' },
]

export default function WhyUs() {
  return (
    <section className="why-us">
      <div className="container why-inner">
        <div className="why-text">
          <div className="section-badge">Pourquoi nous choisir ?</div>
          <h2 className="section-title">La confiance de<br />milliers de clients</h2>
          <p>
            Depuis plus de 10 ans, YASSIR CARS est le partenaire de confiance des voyageurs
            et des professionnels au Maroc. Notre engagement : qualité, transparence et satisfaction.
          </p>
          <div className="why-features">
            {features.map(f => (
              <div className="why-feature" key={f.title}>
                <div className="why-icon"><Icon name={f.icon} /></div>
                <div>
                  <strong>{f.title}</strong>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <a href="#contact" className="btn btn-primary btn-lg">Nous contacter</a>
        </div>

        <div className="why-visual">
          <div className="why-card-big">
            <img className="why-car-image" src="/Cars/Logan.png" alt="Dacia Logan" />
            <div className="why-rating">
              <div className="stars">
                {Array.from({ length: 5 }, (_, i) => <Icon key={i} name="star" />)}
              </div>
              <p><strong>4.9/5</strong> basé sur 2 847 avis</p>
            </div>
          </div>
          <div className="why-badges">
            <span className="badge-chip"><Icon name="trophy" /> Meilleure agence 2024</span>
            <span className="badge-chip"><Icon name="checkCircle" /> Certifié ISO</span>
            <span className="badge-chip"><MoroccoFlag /> Made in Morocco</span>
          </div>
        </div>
      </div>
    </section>
  )
}
