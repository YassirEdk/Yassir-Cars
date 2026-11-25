import { useState } from 'react'
import Icon from './Icon'
import { PHONE, useMediaQuery } from '../hooks/useMediaQuery'
import { featureLabel, featureShort, featureIcon, highlightsFirst } from '../data'

/* Equipment pills. Capped to `limit` pills (`mobileLimit` on phones) plus a "+N"
   that reveals the rest. No `limit` → everything shows on desktop.
   `short`: card version — short labels, the most compared options first.
   `compact`: the "+N" says its number only, to hold on one line. */
export default function FeaturePills({
  features,
  className = 'result-card__equip',
  pillClass = 'equip-pill',
  limit = Infinity,
  mobileLimit = 5,
  short = false,
  compact = false,
}) {
  const [expanded, setExpanded] = useState(false)
  const isMobile = useMediaQuery(PHONE)

  if (!features?.length) return null

  const list = short ? highlightsFirst(features) : features
  const max = isMobile ? mobileLimit : limit
  // A lone hidden pill takes no more room than the "+1" that would hide it.
  const collapsible = list.length > max + 1
  const shown = collapsible && !expanded ? list.slice(0, max) : list
  const hidden = list.length - shown.length

  return (
    <div className={className}>
      {shown.map((f) => (
        <span className={pillClass} key={f}>
          <Icon name={featureIcon(f)} className={`${pillClass}__icon`} /> {short && !expanded ? featureShort(f) : featureLabel(f)}
        </span>
      ))}

      {collapsible && (
        <button
          type="button"
          className={`${pillClass} ${pillClass}--more`}
          onClick={() => setExpanded(v => !v)}
          aria-expanded={expanded}
        >
          {expanded
            ? 'Voir moins'
            : short
              ? <span>+{hidden}<span className={compact || isMobile ? 'sr-only' : undefined}> équipements</span></span>
              : `+${hidden} de plus`}
        </button>
      )}
    </div>
  )
}
