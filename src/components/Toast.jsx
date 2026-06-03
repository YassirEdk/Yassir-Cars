import { useEffect, useState } from 'react'

export default function Toast({ message, onClose }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 10)
    const t2 = setTimeout(() => { setVisible(false); setTimeout(onClose, 400) }, 3600)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div className={`toast ${visible ? 'toast-visible' : ''}`}>
      {message}
    </div>
  )
}
