import type { Reservation } from '../types'
import { getType, reservationStatus, reservationTitle } from '../model'
import { getReservationPresentation, type ReservationPresentationContext } from '../presentation'

export type ReservationCategory = 'all' | 'transportation' | 'accommodation' | 'booking'
export type ReservationSortKey = 'date' | 'title' | 'type' | 'status'
export type SortDirection = 'asc' | 'desc'
export type ReservationGroupBy = 'status' | 'date' | 'type' | 'category' | 'none'

export function sortReservations(
  reservations: Reservation[],
  sortKey: ReservationSortKey,
  sortDirection: SortDirection,
  context: ReservationPresentationContext,
) {
  const direction = sortDirection === 'asc' ? 1 : -1
  return reservations.slice().sort((a, b) => {
    const value = (reservation: Reservation) => {
      if (sortKey === 'title') return reservationTitle(reservation).toLocaleLowerCase()
      if (sortKey === 'type') return getType(reservation.type).label.toLocaleLowerCase()
      if (sortKey === 'status') return reservationStatus(reservation)
      return getReservationPresentation(reservation).getStart(reservation, context) || '9999-12-31'
    }
    const result = value(a).localeCompare(value(b))
    if (result) return result * direction
    return a.id - b.id
  })
}

export interface ReservationGroup {
  key: string
  title: string
  reservations: Reservation[]
}

const CATEGORY_LABELS = {
  transportation: 'Transportation',
  accommodation: 'Accommodation',
  booking: 'Booking',
} as const

export function groupReservations(
  reservations: Reservation[],
  groupBy: ReservationGroupBy,
  context: ReservationPresentationContext,
): ReservationGroup[] {
  if (groupBy === 'none') return [{ key: 'all', title: 'All reservations', reservations }]
  const groups = new Map<string, ReservationGroup>()
  for (const reservation of reservations) {
    const key =
      groupBy === 'status'
        ? reservationStatus(reservation)
        : groupBy === 'type'
          ? reservation.type || 'other'
          : groupBy === 'category'
            ? getReservationPresentation(reservation).category
            : getReservationPresentation(reservation).getStart(reservation, context)?.slice(0, 10) || 'unscheduled'
    const title =
      groupBy === 'status'
        ? reservationStatus(reservation) === 'confirmed'
          ? 'Confirmed'
          : 'Pending'
        : groupBy === 'type'
          ? getType(reservation.type).label
          : groupBy === 'category'
            ? CATEGORY_LABELS[getReservationPresentation(reservation).category]
            : key === 'unscheduled'
              ? 'Unscheduled'
              : new Date(`${key}T00:00:00Z`).toLocaleDateString(undefined, {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  timeZone: 'UTC',
                })
    const group = groups.get(key) || { key, title, reservations: [] }
    group.reservations.push(reservation)
    groups.set(key, group)
  }
  return Array.from(groups.values())
}
