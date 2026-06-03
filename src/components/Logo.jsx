export default function Logo({ size = 46, animated = true }) {
  return (
    <div className={`logo-root ${animated ? 'logo-animated' : ''}`}>
      <svg
        className="logo-mark"
        width={size}
        height={size}
        viewBox="0 0 56 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="bgGrad" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1e1e2e"/>
            <stop offset="100%" stopColor="#0a0a0a"/>
          </linearGradient>
          <linearGradient id="yGrad" x1="10" y1="8" x2="46" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff"/>
            <stop offset="100%" stopColor="rgba(255,255,255,0.75)"/>
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="1.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Hexagonal badge background */}
        <polygon points="28,1 52,15 52,41 28,55 4,41 4,15" fill="url(#bgGrad)"/>

        {/* Outer border — red */}
        <polygon points="28,1 52,15 52,41 28,55 4,41 4,15"
          fill="none" stroke="#E63946" strokeWidth="1.5"/>

        {/* Inner ring — subtle depth */}
        <polygon points="28,6 47,17 47,39 28,50 9,39 9,17"
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.75"/>

        {/* Red horizontal accent band */}
        <rect x="4" y="27" width="48" height="4" fill="#E63946" opacity="0.9"/>

        {/* Y — left arm (wider spread for dynamism) */}
        <line x1="12" y1="9" x2="28" y2="27"
          stroke="url(#yGrad)" strokeWidth="4.5" strokeLinecap="round" filter="url(#glow)"/>

        {/* Y — right arm */}
        <line x1="44" y1="9" x2="28" y2="27"
          stroke="url(#yGrad)" strokeWidth="4.5" strokeLinecap="round" filter="url(#glow)"/>

        {/* Y — stem */}
        <line x1="28" y1="27" x2="28" y2="44"
          stroke="url(#yGrad)" strokeWidth="4.5" strokeLinecap="round" filter="url(#glow)"/>

        {/* Junction dot */}
        <circle cx="28" cy="27" r="3" fill="white"/>

        {/* Speed dots — right side accent */}
        <circle cx="44" cy="37" r="1.5" fill="#E63946" opacity="0.8"/>
        <circle cx="39" cy="37" r="1.5" fill="#E63946" opacity="0.5"/>
        <circle cx="34" cy="37" r="1.5" fill="#E63946" opacity="0.25"/>
      </svg>

      <div className="logo-wordmark">
        <span className="logo-yassir">YASSIR</span>
        <span className="logo-cars"> CARS</span>
      </div>
    </div>
  )
}
