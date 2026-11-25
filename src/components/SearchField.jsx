import Icon from './Icon'
import './searchfield.css'

/* One cell of the search strip (home hero, results page). The control fills the
   whole cell, so the icon and the label sit on top of it and the entire cell is
   clickable. Wrap the cells in `.bk-fields` plus `--tall` or `--compact`. */
export default function SearchField({ id, icon, label, error, children }) {
  return (
    <div
      className={`bk-field bk-field--${id}${error ? ' has-error' : ''}`}
      role="group"
      aria-labelledby={`bk-${id}`}
    >
      <Icon name={icon} className="bk-field__icon" />
      <span className="bk-field__label" id={`bk-${id}`}>{label}</span>
      {children}
      {error && <span className="bk-field__error" role="alert">{error}</span>}
    </div>
  )
}
