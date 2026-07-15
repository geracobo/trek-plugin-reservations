import type { Accommodation, Day, Reservation, Trip } from '../types'
import { getType, reservationStatus } from '../model'
import { ReservationCardDetails } from './ReservationCardDetails'
import { ReservationCardHeader } from './ReservationCardHeader'
import type { CardFieldKey } from './ReservationCardSections'

interface ReservationCardProps {
  reservation: Reservation
  trip: Trip | null
  days: Day[]
  accommodations: Accommodation[]
  selectedFields: Set<CardFieldKey>
  onEdit: (reservation: Reservation) => void
  onDelete: (reservation: Reservation) => void
}

export function ReservationCard({
  reservation,
  trip,
  days,
  accommodations,
  selectedFields,
  onEdit,
  onDelete,
}: ReservationCardProps) {
  const typeInfo = getType(reservation.type)
  const confirmed = reservationStatus(reservation) === 'confirmed'
  const isAutomatedTransit = reservation.type === 'transit'

  return (
    <article
      className={`trek-card flex min-w-0 flex-col overflow-hidden rounded-xl border p-0 transition-shadow duration-150 hover:shadow-md ${isAutomatedTransit ? 'border-[rgba(124,58,237,0.22)]' : confirmed ? 'border-success/25' : 'border-warning/25'}`}
      style={{ '--reservation-color': typeInfo.color } as React.CSSProperties}
    >
      <ReservationCardHeader reservation={reservation} onEdit={onEdit} onDelete={onDelete} />
      <ReservationCardDetails
        reservation={reservation}
        trip={trip}
        days={days}
        accommodations={accommodations}
        selectedFields={selectedFields}
      />
    </article>
  )
}
