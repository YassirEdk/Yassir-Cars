import { services } from '../data'
import { useScrollReveal } from '../hooks/useScrollReveal'
import { useSettings } from '../lib/SettingsContext'
import { waLink } from '../lib/contact'
import Icon from './Icon'
import SectionHead from './SectionHead'
import './services.css'

const main = services.find(s => s.recommended) ?? services[0]
const others = services.filter(s => s !== main)

const Features = ({ list, className }) => (
  <ul className={className}>
    {list.map(f => <li key={f}><Icon name="check" /> {f}</li>)}
  </ul>
)

/* The service most people come for, next to a photo of what they get. */
function MainService({ service }) {
  const ref = useScrollReveal()
  return (
    <article className="svc-main" ref={ref}>
      {service.recommended && <p className="svc-main__badge"><Icon name="star" /> Recommandé</p>}
      <h3>{service.title}</h3>
      <p className="svc-main__text">{service.description}</p>
      <Features list={service.features} className="svc-main__list" />
      <a href="#flotte" className="btn btn-light svc-main__cta">
        Choisir une voiture <Icon name="arrowRight" className="btn__arrow" />
      </a>
      <img className="svc-main__car" src="/cars-fit/Clio.webp" width="720" height="403" alt="Renault Clio, une voiture de notre flotte" loading="lazy" decoding="async" />
    </article>
  )
}

/* The others are arranged with the agency: each line opens WhatsApp, with the name
   of the service already written. */
function ServiceRow({ service, index, whatsapp }) {
  const ref = useScrollReveal(index * 60)
  const Row = whatsapp ? 'a' : 'div'
  const link = whatsapp && {
    href: waLink(whatsapp, `Bonjour YASSIR CARS, je souhaite des informations sur le service « ${service.title} ».`),
    target: '_blank',
    rel: 'noopener noreferrer',
  }
  return (
    <li className="svc-item" ref={ref}>
      <Row className="svc-row" {...link}>
        <span className="svc-row__icon"><Icon name={service.icon} /></span>
        <span className="svc-row__text">
          <strong>{service.title}</strong>
          <span>{service.description}</span>
        </span>
        {whatsapp && (
          <span className="svc-row__go">
            <span className="sr-only">Demander sur WhatsApp</span>
            <Icon name="arrowRight" />
          </span>
        )}
        <span className="svc-row__list">
          {service.features.map(f => <span key={f}><Icon name="check" /> {f}</span>)}
        </span>
      </Row>
    </li>
  )
}

export default function Services() {
  const { settings } = useSettings()
  return (
    <section className="section services" id="services">
      <div className="container">
        <SectionHead
          title="Tout ce dont vous avez besoin"
          text="YASSIR CARS propose une gamme complète de services pour rendre votre expérience unique et mémorable."
        />
        <div className="services__grid">
          <MainService service={main} />
          <ul className="svc-list">
            {others.map((s, i) => <ServiceRow key={s.title} service={s} index={i} whatsapp={settings.whatsapp} />)}
          </ul>
        </div>
      </div>
    </section>
  )
}
