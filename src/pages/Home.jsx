import { useState } from 'react'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import Brands from '../components/Brands'
import Services from '../components/Services'
import Fleet from '../components/Fleet'
import HowItWorks from '../components/HowItWorks'
import WhyUs from '../components/WhyUs'
import Testimonials from '../components/Testimonials'
import PromoBanner from '../components/PromoBanner'
import Contact from '../components/Contact'
import Footer from '../components/Footer'
import BackToTop from '../components/BackToTop'
import Toast from '../components/Toast'

export default function Home() {
  const [toast, setToast] = useState(null)

  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(null), 4000)
  }

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Brands />
        <PromoBanner />
        <Services />
        <Fleet />
        <HowItWorks />
        <WhyUs />
        <Testimonials />
        <Contact onSubmit={showToast} />
      </main>
      <Footer />
      <BackToTop />
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  )
}
