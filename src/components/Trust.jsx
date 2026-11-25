import { useEffect, useRef, useState } from 'react'
import { testimonials } from '../data'
import { useScrollReveal } from '../hooks/useScrollReveal'
import Icon, { MoroccoFlag } from './Icon'
import { SectionTitle } from './SectionHead'
import './trust.css'

const features = [
  { icon: 'checkCircle', title: 'Tarifs transparents', desc: 'Aucun frais caché. Le prix affiché est le prix que vous payez.' },
  { icon: 'shield', title: 'Assurance complète', desc: 'Tous nos véhicules sont couverts tous risques avec assistance.' },
  { icon: 'headset', title: 'Support 24h/24 - 7j/7', desc: 'Une équipe dédiée disponible à tout moment pour vous aider.' },
  { icon: 'globe', title: '15 agences au Maroc', desc: 'Présents dans les principales villes et aéroports du royaume.' },
]

const Stars = ({ count = 5, className }) => (
  <span className={className} role="img" aria-label={`${count} étoiles sur 5`}>
    {Array.from({ length: 5 }, (_, i) => <Icon key={i} name="star" className={i < count ? '' : 'is-empty'} />)}
  </span>
)

/* The score, and one of our cars across the cut. */
function Rating() {
  const ref = useScrollReveal(80)
  return (
    <div className="rating" ref={ref}>
      <div className="rating__scene">
        <p className="rating__score"><strong>4.9</strong><span>/5</span></p>
        <Stars className="rating__stars" />
        <p className="rating__count">basé sur 2 847 avis</p>
        <img className="rating__car" src="/cars-fit/Toyota Land Cruiser.webp" width="720" height="369" alt="Toyota Land Cruiser, une voiture de notre flotte" loading="lazy" decoding="async" />
      </div>
      <ul className="rating__marks">
        <li><Icon name="trophy" /> Meilleure agence 2024</li>
        <li><Icon name="checkCircle" /> Certifié ISO</li>
        <li><MoroccoFlag size="20" /> Made in Morocco</li>
      </ul>
    </div>
  )
}

// The quotes are written into some of the texts; the card draws its own.
const bare = (text) => text.replace(/^["«\s]+|["»\s]+$/g, '')

function Review({ t }) {
  return (
    <li className={`review ${t.featured ? 'review--dark' : ''}`}>
      <div className="review__top">
        <Stars count={t.rating} className="review__stars" />
        <Icon name="quotes" className="review__mark" />
      </div>
      <blockquote className="review__text">{bare(t.text)}</blockquote>
      <div className="review__author">
        <span className="review__avatar" aria-hidden="true">{t.initials}</span>
        <span>
          <strong>{t.name}</strong>
          <span>{t.location}</span>
        </span>
      </div>
    </li>
  )
}

/* One row of reviews: swiped on a phone, moved with the arrows elsewhere. */
function Reviews() {
  const railRef = useRef(null)
  // Nothing more to see on that side.
  const [end, setEnd] = useState({ left: true, right: false })

  useEffect(() => {
    const rail = railRef.current
    const read = () => setEnd({
      left: rail.scrollLeft < 8,
      right: rail.scrollLeft > rail.scrollWidth - rail.clientWidth - 8,
    })
    read()
    rail.addEventListener('scroll', read, { passive: true })
    window.addEventListener('resize', read)
    return () => {
      rail.removeEventListener('scroll', read)
      window.removeEventListener('resize', read)
    }
  }, [])

  const move = (dir) => {
    const rail = railRef.current
    const card = rail.firstElementChild.getBoundingClientRect().width + parseFloat(getComputedStyle(rail).columnGap)
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    rail.scrollBy({ left: dir * card, behavior: calm ? 'auto' : 'smooth' })
  }

  return (
    <section className="reviews" id="avis" aria-labelledby="avis-title">
      <div className="reviews__head">
        <h3 className="reviews__title" id="avis-title">Ce que disent nos clients</h3>
        <div className="reviews__nav">
          <button type="button" onClick={() => move(-1)} disabled={end.left} aria-label="Avis précédents"><Icon name="arrowLeft" /></button>
          <button type="button" onClick={() => move(1)} disabled={end.right} aria-label="Avis suivants"><Icon name="arrowRight" /></button>
        </div>
      </div>
      {/* Focusable: the arrow keys scroll it. */}
      <ul className="reviews__rail" ref={railRef} tabIndex={0} aria-label="Avis de nos clients">
        {testimonials.map(t => <Review key={t.id} t={t} />)}
      </ul>
    </section>
  )
}

/* Why us, and what clients say: one section, since they answer one question. */
export default function Trust() {
  return (
    <section className="section trust" id="confiance">
      <div className="container">
        <div className="trust__grid">
          <div>
            <SectionTitle>La confiance de milliers de clients</SectionTitle>
            <p className="section-subtitle">
              Depuis plus de 10 ans, YASSIR CARS est le partenaire de confiance des voyageurs
              et des professionnels au Maroc. Notre engagement : qualité, transparence et satisfaction.
            </p>
            <ul className="trust__features">
              {features.map(f => (
                <li key={f.title}>
                  <Icon name={f.icon} />
                  <strong>{f.title}</strong>
                  <p>{f.desc}</p>
                </li>
              ))}
            </ul>
            <a href="#contact" className="btn btn-dark btn-lg">Nous contacter</a>
          </div>
          <Rating />
        </div>
        <Reviews />
      </div>
    </section>
  )
}
