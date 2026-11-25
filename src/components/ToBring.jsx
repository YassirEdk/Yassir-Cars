import Icon from './Icon'

/* What to have on the day, said before the request is sent. */
export default function ToBring() {
  return (
    <p className="to-bring">
      <Icon name="clipboard" />
      <span>
        <strong>À prévoir le jour du départ :</strong> permis de conduire, CIN ou passeport, et une
        caution, rendue au retour du véhicule.
      </span>
    </p>
  )
}
