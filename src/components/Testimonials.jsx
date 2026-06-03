import { testimonials } from '../data'
import { useScrollReveal } from '../hooks/useScrollReveal'

function Stars({ count }) {
  return <div className="testimonial-stars">{'★'.repeat(count)}{'☆'.repeat(5 - count)}</div>
}

function TestimonialCard({ t }) {
  const ref = useScrollReveal()
  return (
    <div className={`testimonial-card ${t.featured ? 'featured-testimonial' : ''}`} ref={ref}>
      <Stars count={t.rating} />
      <p className="testimonial-text">{t.text}</p>
      <div className="testimonial-author">
        <div className="author-avatar">{t.initials}</div>
        <div>
          <strong>{t.name}</strong>
          <span>{t.location}</span>
        </div>
      </div>
    </div>
  )
}

export default function Testimonials() {
  return (
    <section className="section" id="avis">
      <div className="container">
        <div className="section-header">
          <div className="section-badge">Témoignages</div>
          <h2 className="section-title">Ce que disent nos clients</h2>
          <p className="section-subtitle">Des milliers de voyageurs nous font confiance chaque année.</p>
        </div>
        <div className="testimonials-grid">
          {testimonials.map(t => <TestimonialCard key={t.id} t={t} />)}
        </div>
      </div>
    </section>
  )
}
