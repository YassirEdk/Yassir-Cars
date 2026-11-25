import { useEffect, useRef, useState } from 'react'

/* True once the element has come on screen, for good. Straight away for visitors
   who asked for less motion. */
export function useInView(threshold = 0.3) {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setSeen(true)
      return
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      setSeen(true)
    }, { threshold })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [threshold])

  return [ref, seen]
}
