import { createPortal } from 'react-dom'
import { useDialog } from '../hooks/useDialog'
import Icon from './Icon'
import './sheet.css'

/* Panel that slides up from the bottom of a phone. Rendered on <body>, because
   an animated ancestor would break its fixed position. */
export default function Sheet({ title, onClose, footer, className = '', children }) {
  const panelRef = useDialog(onClose)

  return createPortal(
    <div className="sheet">
      <div className="sheet__scrim" onClick={onClose} aria-hidden="true" />
      <div className={`sheet__panel ${className}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={panelRef}>
        <div className="sheet__head">
          <h2 className="sheet__title">{title}</h2>
          <button type="button" className="sheet__close" onClick={onClose} aria-label="Fermer"><Icon name="close" size={16} /></button>
        </div>
        <div className="sheet__body">{children}</div>
        {footer && <div className="sheet__foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
