import { steps } from '../data'
import { useInView } from '../hooks/useInView'
import Icon from './Icon'
import SectionHead from './SectionHead'
import './steps.css'

/* Four stops along a road. The stops have the shape of the logo. */
export default function HowItWorks() {
  const [ref, seen] = useInView(0.25)
  return (
    <section className="section section-dark slanted steps" id="comment">
      <div className="container">
        <SectionHead
          title="Louer en 4 étapes"
          text="Réservez votre véhicule en quelques minutes depuis votre téléphone ou en agence."
        />
        <ol className={`steps__list ${seen ? 'is-seen' : ''}`} ref={ref}>
          {steps.map((step, i) => (
            <li className="step" key={step.number} style={{ '--i': i }}>
              <span className="step__stop">
                <svg className="step__hex" viewBox="0 0 56 56" aria-hidden="true" focusable="false">
                  <polygon points="28,1 52,15 52,41 28,55 4,41 4,15" />
                </svg>
                <Icon name={step.icon} />
              </span>
              <div className="step__text">
                <p className="step__n">Étape {i + 1}</p>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
