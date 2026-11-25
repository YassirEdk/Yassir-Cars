import { useId } from 'react'

export default function Logo({ size = 46 }) {
  // Several logos share a page (header, menu, footer): each has its own gradients.
  const id = useId()
  const bg = `${id}bg`
  const ink = `${id}y`

  return (
    <span className="logo-root">
      <svg className="logo-mark" width={size} height={size} viewBox="0 0 56 56" fill="none" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={bg} x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2b2f37" />
            <stop offset="100%" stopColor="#0f1114" />
          </linearGradient>
          <linearGradient id={ink} x1="10" y1="8" x2="46" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.8)" />
          </linearGradient>
        </defs>

        {/* Hexagon, its red outline, and the red band across it */}
        <polygon points="28,1 52,15 52,41 28,55 4,41 4,15" fill={`url(#${bg})`} />
        <polygon className="logo-mark__edge" points="28,1 52,15 52,41 28,55 4,41 4,15" stroke="var(--red)" strokeWidth="1.5" />
        <polygon points="28,6 47,17 47,39 28,50 9,39 9,17" stroke="rgba(255,255,255,0.06)" strokeWidth="0.75" />
        <rect x="4" y="27" width="48" height="4" fill="var(--red)" opacity="0.9" />

        {/* The Y */}
        <g stroke={`url(#${ink})`} strokeWidth="4.5" strokeLinecap="round">
          <path d="M12 9 28 27" />
          <path d="M44 9 28 27" />
          <path d="M28 27v17" />
        </g>
        <circle cx="28" cy="27" r="3" fill="#fff" />

        {/* Speed dots */}
        <circle cx="44" cy="37" r="1.5" fill="var(--red)" opacity="0.8" />
        <circle cx="39" cy="37" r="1.5" fill="var(--red)" opacity="0.5" />
        <circle cx="34" cy="37" r="1.5" fill="var(--red)" opacity="0.25" />
      </svg>

      <span className="logo-wordmark">
        <span className="logo-yassir">YASSIR</span> <span className="logo-cars">CARS</span>
      </span>
    </span>
  )
}
