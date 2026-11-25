import { useEffect, useState } from 'react'
import SocialIcon from './SocialIcon'
import { useSettings } from '../lib/SettingsContext'
import { waLink } from '../lib/contact'
import { focusBooking } from '../lib/scroll'

/* Phones: the two ways to book, always within thumb's reach. Steps aside while
   the search card itself is on screen. */
export default function BookBar() {
  const { settings } = useSettings()
  const [show, setShow] = useState(false)

  useEffect(() => {
    const card = document.getElementById('reserver')
    if (!card) return
    const observer = new IntersectionObserver(([entry]) => setShow(!entry.isIntersecting))
    observer.observe(card)
    return () => observer.disconnect()
  }, [])

  return (
    <div className={`book-bar ${show ? 'is-shown' : ''}`} inert={show ? undefined : ''}>
      {settings.whatsapp && (
        <a
          className="book-bar__wa"
          href={waLink(settings.whatsapp, 'Bonjour YASSIR CARS, je souhaite des informations.')}
          target="_blank"
          rel="noopener noreferrer"
        >
          <SocialIcon name="whatsapp" /> WhatsApp
        </a>
      )}
      <button type="button" className="btn btn-primary book-bar__go" onClick={focusBooking}>
        <span>Réserver<span className="book-bar__more"> une voiture</span></span>
      </button>
    </div>
  )
}
