import { useEffect, useState } from 'react'
import { useInView } from '../hooks/useInView'
import Icon from './Icon'
import './stats.css'

const STATS = [
  { icon: 'car',     to: 500, suffix: '+',   label: 'Véhicules' },
  { icon: 'pin',     to: 15,  suffix: '+',   label: 'Agences' },
  { icon: 'users',   to: 10,  suffix: 'K+',  label: 'Clients satisfaits' },
  { icon: 'headset', to: 24,  suffix: '/7',  label: 'Assistance' },
]

const COUNT_MS = 1500
const easeOut = (t) => 1 - Math.pow(1 - t, 4)

/* 0 → 1 once the row comes on screen; straight to 1 for visitors who asked for
   less motion. */
function useCountUp() {
  const [ref, seen] = useInView(0.35)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!seen) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setProgress(1)
      return
    }
    let frame = 0
    const started = performance.now()
    const step = (now) => {
      const t = Math.min(1, Math.max(0, (now - started) / COUNT_MS))
      setProgress(easeOut(t))
      if (t < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [seen])

  return [ref, progress]
}

export default function Stats() {
  const [ref, progress] = useCountUp()
  return (
    <section className="figures" id="chiffres" aria-label="YASSIR CARS en chiffres">
      <ul className="container figures__row" ref={ref}>
        {STATS.map(s => (
          <li className="figure" key={s.label}>
            <span className="figure__num" aria-hidden="true">{Math.round(s.to * progress)}{s.suffix}</span>
            <span className="sr-only">{s.to}{s.suffix} </span>
            <span className="figure__label"><Icon name={s.icon} /> {s.label}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
