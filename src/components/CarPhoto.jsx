import { useState } from 'react'
import { lightPhoto } from '../lib/photos'
import { knownFit, measureFit, needsCors } from '../lib/photoFit'
import './carphoto.css'

/* One photo of a car. Wherever it comes from, the car fills the frame the same way
   and stands on the same line. Put it in a `.stage` for the two-tone backdrop. */
export default function CarPhoto({ src: url, alt, className = '', lazy = true, onFail }) {
  const src = lightPhoto(url)
  const [fit, setFit] = useState(() => knownFit(src))
  const [cors, setCors] = useState(() => needsCors(src))

  return (
    <span className={['car-photo', `car-photo--${fit?.kind ?? 'wait'}`, ...(fit?.edges ?? []).map(e => `car-photo--at-${e}`), className].join(' ')}>
      <span
        className="car-photo__box"
        style={fit?.ratio
          ? { '--r': fit.ratio, '--zoom': `${fit.zoom}%`, '--left': `${fit.left}%`, '--top': `${fit.top}%` }
          : undefined}
      >
        <img
          key={cors ? 'cors' : 'plain'}
          src={src}
          alt={alt}
          crossOrigin={cors ? 'anonymous' : undefined}
          loading={lazy ? 'lazy' : undefined}
          decoding="async"
          onLoad={(e) => setFit(measureFit(e.currentTarget, src))}
          // Refused as readable: ask again as an ordinary photo.
          onError={() => (cors ? setCors(false) : onFail?.())}
        />
      </span>
    </span>
  )
}
