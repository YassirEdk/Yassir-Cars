import { useState, useEffect } from 'react'
import Icon from './Icon'
import { featureLabel, featureIcon } from '../data'

// Equipment/feature pills. On mobile the list is capped to `mobileLimit` pills
// plus a tappable "+N de plus" that reveals the rest (and "Voir moins" to
// collapse again). On desktop every feature is shown.
export default function FeaturePills({
  features,
  className = 'result-card__equip',
  pillClass = 'equip-pill',
  mobileLimit = 5,
}) {
  const [expanded, setExpanded] = useState(false)
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches,
  )

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const onChange = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  if (!features?.length) return null

  const collapsed = isMobile && !expanded
  const shown = collapsed ? features.slice(0, mobileLimit) : features
  const hidden = features.length - shown.length

  return (
    <div className={className}>
      {shown.map((f) => (
        <span className={pillClass} key={f} title={featureLabel(f)}>
          <Icon name={featureIcon(f)} className={`${pillClass}__icon`} /> {featureLabel(f)}
        </span>
      ))}

      {hidden > 0 && (
        <button
          type="button"
          className={`${pillClass} ${pillClass}--more`}
          onClick={() => setExpanded(true)}
        >
          +{hidden} de plus
        </button>
      )}

      {isMobile && expanded && features.length > mobileLimit && (
        <button
          type="button"
          className={`${pillClass} ${pillClass}--more`}
          onClick={() => setExpanded(false)}
        >
          Voir moins
        </button>
      )}
    </div>
  )
}
