import { useRef, useState } from 'react'
import CarPhoto from './CarPhoto'
import Icon from './Icon'
import { lightPhoto } from '../lib/photos'

/* Photo gallery of a car card: swipe on a phone, arrows with a mouse, dots to
   show where you are. Give it a `key` per car, so a new car starts at photo 1.
   `fallback` shows when there is no photo, or none of them loads. `eager`: on screen
   from the start, so the first photo is not left to lazy loading. */
export default function PhotoRail({ photos, alt, className = '', fallback = null, eager = false }) {
  const railRef = useRef(null)
  const [idx, setIdx] = useState(0)
  const [failed, setFailed] = useState([])
  const shown = photos.map(lightPhoto).filter(p => !failed.includes(p))

  /* The other photos are fetched when the visitor reaches for them: pointing,
     touching or tabbing to the card comes before the first move. For every card at
     once they weighed ten times the rest of the page. */
  const [armed, setArmed] = useState(false)
  const arm = () => setArmed(true)

  if (!shown.length) return fallback

  const onScroll = () => {
    const rail = railRef.current
    if (rail?.clientWidth) setIdx(Math.round(rail.scrollLeft / rail.clientWidth))
  }
  const go = (dir) => (e) => {
    e.preventDefault(); e.stopPropagation()
    const rail = railRef.current
    const to = Math.max(0, Math.min(shown.length - 1, idx + dir))
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    rail.scrollTo({ left: to * rail.clientWidth, behavior: calm ? 'auto' : 'smooth' })
  }

  return (
    <div className={`photo-rail ${className}`} onPointerEnter={arm} onTouchStart={arm} onFocus={arm}>
      <div className="photo-rail__track" ref={railRef} onScroll={onScroll}>
        {shown.map((src, i) => (i === 0 || armed
          ? (
            <CarPhoto
              key={src}
              src={src}
              alt={i === 0 ? alt : `${alt}, photo ${i + 1}`}
              className="photo-rail__slide"
              lazy={!(eager && i === 0)}
              onFail={() => setFailed(f => [...f, src])}
            />
          )
          : <span key={src} className="photo-rail__slide" />
        ))}
      </div>

      {shown.length > 1 && (
        <>
          {idx > 0 && (
            <button type="button" className="gallery-nav gallery-nav--prev" onClick={go(-1)} aria-label="Photo précédente"><Icon name="caretLeft" /></button>
          )}
          {idx < shown.length - 1 && (
            <button type="button" className="gallery-nav gallery-nav--next" onClick={go(1)} aria-label="Photo suivante"><Icon name="caretRight" /></button>
          )}
          <div className="gallery-dots" aria-hidden="true">
            {shown.map((src, i) => <span key={src} className={i === idx ? 'active' : ''} />)}
          </div>
        </>
      )}
    </div>
  )
}
