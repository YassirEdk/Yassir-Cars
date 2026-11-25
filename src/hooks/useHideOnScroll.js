import { useEffect, useState } from 'react'

/* Should a sticky bar be out of the way? True while the visitor scrolls down,
   false again as soon as they scroll up. Stays put while one of its menus is
   open, or while keyboard focus is inside it. */
export function useHideOnScroll(ref, { after = 200 } = {}) {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let lastY = window.scrollY
    let frame = 0
    const read = () => {
      frame = 0
      const bar = ref.current
      const y = window.scrollY
      const busy = bar?.querySelector('[aria-expanded="true"]') || bar?.querySelector(':focus-visible')
      if (y < after || busy) setHidden(false)
      else if (y > lastY + 6) setHidden(true)
      else if (y < lastY - 6) setHidden(false)
      lastY = y
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(read) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [ref, after])

  return hidden
}
