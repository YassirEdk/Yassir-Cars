import { services } from '../data'
import { useScrollReveal } from '../hooks/useScrollReveal'
import Icon from './Icon'

const serviceIcons = ['car', 'calendar', 'plane', 'briefcase', 'van', 'shield']

function ServiceCard({ service, index }) {
  const ref = useScrollReveal()
  const cls = service.featured
    ? 'service-card card-featured'
    : service.recommended
      ? 'service-card card-recommended'
      : 'service-card'

  return (
    <div className={cls} ref={ref}>
      {service.recommended && (
        <span className="recommended-badge"><Icon name="star" /> Recommandé</span>
      )}
      <span className="service-icon"><Icon name={serviceIcons[index] ?? 'car'} /></span>
      <h3>{service.title}</h3>
      <p>{service.description}</p>
      <ul className="service-list">
        {service.features.map(f => <li key={f}><Icon name="check" /> {f}</li>)}
      </ul>
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
          {services.map((s, i) => <ServiceCard key={s.title} service={s} index={i} />)}
        </div>
      </div>
    </section>
  )
}
