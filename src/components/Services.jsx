import { services } from '../data'
import { useScrollReveal } from '../hooks/useScrollReveal'

function ServiceCard({ service }) {
  const ref = useScrollReveal()
  const cls = service.featured
    ? 'service-card card-featured'
    : service.recommended
      ? 'service-card card-recommended'
      : 'service-card'

  return (
    <div className={cls} ref={ref}>
      {service.recommended && (
        <span className="recommended-badge">⭐ Recommandé</span>
      )}
      <span className="service-icon">{service.icon}</span>
      <h3>{service.title}</h3>
      <p>{service.description}</p>
      <ul className="service-list">
        {service.features.map(f => <li key={f}>✓ {f}</li>)}
      </ul>
      <a href="#reserver" className="service-link">En savoir plus →</a>
    </div>
  )
}

export default function Services() {
  return (
    <section className="section" id="services">
      <div className="container">
        <div className="section-header">
          <div className="section-badge">Nos Services</div>
          <h2 className="section-title">Tout ce dont vous avez besoin</h2>
          <p className="section-subtitle">
            YASSIR CARS propose une gamme complète de services pour rendre votre expérience unique et mémorable.
          </p>
        </div>
        <div className="services-grid">
          {services.map(s => <ServiceCard key={s.title} service={s} />)}
        </div>
      </div>
    </section>
  )
}
