/* Title of a section, with the slash of the brand as its full stop. */
export function SectionTitle({ as: Tag = 'h2', children, ...props }) {
  const words = children.split(' ')
  const last = words.pop()
  return (
    <Tag className="section-title" {...props}>
      {words.length > 0 && `${words.join(' ')} `}
      {/* Holds on to the last word: the slash must not wrap alone. */}
      <span className="section-title__end">{last}<i className="slash" aria-hidden="true" /></span>
    </Tag>
  )
}

/* Title on the left, what it is about on the right. */
export default function SectionHead({ title, text }) {
  return (
    <header className="section-head">
      <SectionTitle>{title}</SectionTitle>
      {text && <p className="section-subtitle">{text}</p>}
    </header>
  )
}
