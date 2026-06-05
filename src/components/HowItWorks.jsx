import { steps } from '../data'
import { useScrollReveal } from '../hooks/useScrollReveal'
import Icon from './Icon'

function StepCard({ step, isLast }) {
  const ref = useScrollReveal()
  return (
    <div className="step-card" ref={ref}>
      <div className="step-number">{step.number}</div>
      <span className="step-icon"><Icon name={step.icon} /></span>
      <h3>{step.title}</h3>
      <p>{step.description}</p>
      {!isLast && <div className="step-connector" />}
    </div>
  )
}

export default function HowItWorks() {
  return (
    <section className="section" id="comment">
      <div className="container">
        <div className="section-header">
          <div className="section-badge">Simple & Rapide</div>
          <h2 className="section-title">Louer en 4 étapes</h2>
          <p className="section-subtitle">
            Réservez votre véhicule en quelques minutes depuis votre téléphone ou en agence.
          </p>
        </div>
        <div className="steps-grid">
          {steps.map((step, i) => (
            <StepCard key={step.number} step={step} isLast={i === steps.length - 1} />
          ))}
        </div>
      </div>
    </section>
  )
}
