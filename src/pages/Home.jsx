import { useEffect, useState } from 'react'
import { whenIdle } from '../lib/idle'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import Stats from '../components/Stats'
import Brands from '../components/Brands'
import Services from '../components/Services'
import Fleet from '../components/Fleet'
import HowItWorks from '../components/HowItWorks'
import Trust from '../components/Trust'
import PromoBanner from '../components/PromoBanner'
import Contact from '../components/Contact'
import Footer from '../components/Footer'
import BackToTop from '../components/BackToTop'
import BookBar from '../components/BookBar'
import Toast from '../components/Toast'

export default function Home() {
  const [toast, setToast] = useState(null)

  /* Where a visit goes from here: the search results and the fleet page. Their
     code is fetched while the visitor reads, so the next page opens at once
     instead of on a blank screen. */
  useEffect(() => whenIdle(() => {
    import('./SearchResults').catch(() => {})
    import('./AllCars').catch(() => {})
  }), [])

  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(null), 4000)
  }

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Stats />
        <Brands />
        <PromoBanner />
        {/* Cars and prices first: that is what people come for. */}
        <Fleet />
        <HowItWorks />
        <Services />
        <Trust />
        <Contact onSubmit={showToast} />
      </main>
      <Footer />
      <BackToTop />
      <BookBar />
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  )
}
