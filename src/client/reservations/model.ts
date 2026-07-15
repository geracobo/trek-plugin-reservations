import type { LucideIcon } from 'lucide-react'
import type { Accommodation, Day, Reservation, StatusFilter } from './types'
import { getReservationPresentation, RESERVATION_PRESENTATIONS } from './presentation'

export const TRANSPORT_TYPES = new Set(
  Object.values(RESERVATION_PRESENTATIONS)
    .filter((presentation) => presentation.category === 'transportation')
    .map((presentation) => presentation.type),
)

export interface TypeOption {
  value: string
  label: string
  Icon: LucideIcon
  color: string
}

export const TYPE_OPTIONS: TypeOption[] = Object.values(RESERVATION_PRESENTATIONS).map(
  ({ type: value, label, Icon, color }) => ({ value, label, Icon, color }),
)

export function getType(type: string | null | undefined): TypeOption {
  const { type: value, label, Icon, color } = getReservationPresentation(type)
  return { value, label, Icon, color }
}

export function normalizeMetadata(reservation: Reservation): Record<string, unknown> {
  const { metadata } = reservation
  if (!metadata) return {}
  if (typeof metadata === 'string') {
    try {
      const parsed = JSON.parse(metadata)
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  }
  return metadata
}

export function reservationRoute(reservation: Reservation) {
  return getReservationPresentation(reservation).getRoute(reservation, { days: [], accommodations: [] })
}

export function reservationStatus(reservation: Reservation): Exclude<StatusFilter, 'all'> {
  return reservation.status === 'confirmed' ? 'confirmed' : 'pending'
}

export function reservationTitle(reservation: Reservation) {
  return getReservationPresentation(reservation).getTitle(reservation, { days: [], accommodations: [] })
}

export function filterAndSortReservations(
  reservations: Reservation[],
  selectedTypes: Set<string>,
  statusFilter: StatusFilter,
  days: Day[],
  accommodations: Accommodation[],
) {
  const context = { days, accommodations }

  return reservations
    .filter((reservation) => selectedTypes.size === 0 || selectedTypes.has(reservation.type ?? 'other'))
    .filter((reservation) => statusFilter === 'all' || reservationStatus(reservation) === statusFilter)
    .map((reservation) => ({
      reservation,
      key: getReservationPresentation(reservation).getStart(reservation, context),
    }))
    .sort((a, b) => {
      if (a.key !== b.key) {
        if (a.key === null) return 1
        if (b.key === null) return -1
        return a.key < b.key ? -1 : 1
      }
      const aCreatedAt = typeof a.reservation.created_at === 'string' ? a.reservation.created_at : ''
      const bCreatedAt = typeof b.reservation.created_at === 'string' ? b.reservation.created_at : ''
      return aCreatedAt.localeCompare(bCreatedAt)
    })
    .map(({ reservation }) => reservation)
}
