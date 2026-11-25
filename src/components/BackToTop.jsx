import { useState, useEffect, useRef } from 'react'
import Icon from './Icon'

/* Back to the top. The ring around it fills as the page is read. */
export default function BackToTop() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let frame = 0
    let lastY = window.scrollY
    // With no margin to stand in, it would cover the page: there it only comes out
    // for a visitor going back up.
    const narrow = window.matchMedia('(max-width: 1350px)')
    const read = () => {
      frame = 0
      const y = window.scrollY
      const goingUp = y < lastY - 2 ? true : y > lastY + 2 ? false : null
      lastY = y
      const room = document.documentElement.scrollHeight - window.innerHeight
      setVisible(was => y > 600 && (!narrow.matches || (goingUp ?? was)))
      ref.current?.style.setProperty('--read', room > 0 ? Math.min(1, y / room).toFixed(3) : 0)
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(read) }
    read()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  const up = () => {
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' })
  }

  return (
    <button
      type="button"
      ref={ref}
      className={`back-to-top ${visible ? 'visible' : ''}`}
      onClick={up}
      aria-label="Retour en haut"
      inert={visible ? undefined : ''}
    >
      <svg className="back-to-top__ring" viewBox="0 0 52 52" fill="none" aria-hidden="true" focusable="false">
        <circle cx="26" cy="26" r="24.5" pathLength="1" />
      </svg>
      <Icon name="arrowUp" />
    </button>
  )
}
