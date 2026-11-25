import './splitnotice.css'

/* A page that is one message (404, nothing to book yet): the words on light, one of
   our cars on dark, and the cut of the hero between them. */
export default function SplitNotice({ code, title, tagline, message, children }) {
  return (
    <main className="notice">
      <div className="container notice__inner">
        <div className="notice__text">
          {code && <p className="notice__code" aria-hidden="true">{code}</p>}
          <h1 className="notice__title">{title}</h1>
          {tagline && <p className="notice__tagline">{tagline}</p>}
          <p className="notice__message">{message}</p>
          <div className="notice__actions">{children}</div>
        </div>
        <div className="notice__car" aria-hidden="true">
          <img src="/cars-fit/Toyota Land Cruiser.webp" width="720" height="369" alt="" />
        </div>
      </div>
    </main>
  )
}

function Arrow({ back = false }) {
  return (
    <span className={`error-btn__arrow ${back ? 'error-btn__arrow--back' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
        strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" focusable="false">
        <path d={back ? 'M19 12H5M11 18l-6-6 6-6' : 'M5 12h14M13 6l6 6-6 6'} />
      </svg>
    </span>
  )
}

// What goes inside its buttons: the words, and the arrow on the side it points to.
export const Back = ({ children }) => <><Arrow back /> {children}</>
export const Onward = ({ children }) => <>{children} <Arrow /></>
