import type { Reservation } from '../types'
import { getType, reservationDate, reservationStatus, reservationTitle } from '../model'

export type ReservationCategory = 'all' | 'transportation' | 'accommodation' | 'booking'
export type ReservationSortKey = 'date' | 'title' | 'type' | 'status'
export type SortDirection = 'asc' | 'desc'
export type ReservationGroupBy = 'status' | 'date' | 'type' | 'none'

export function sortReservations(
  reservations: Reservation[],
  sortKey: ReservationSortKey,
  sortDirection: SortDirection,
) {
  const direction = sortDirection === 'asc' ? 1 : -1
  return reservations.slice().sort((a, b) => {
    const value = (reservation: Reservation) => {
      if (sortKey === 'title') return reservationTitle(reservation).toLocaleLowerCase()
      if (sortKey === 'type') return getType(reservation.type).label.toLocaleLowerCase()
      if (sortKey === 'status') return reservationStatus(reservation)
      return reservationDate(reservation) || '9999-12-31'
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

export function groupReservations(reservations: Reservation[], groupBy: ReservationGroupBy): ReservationGroup[] {
  if (groupBy === 'none') return [{ key: 'all', title: 'All reservations', reservations }]
  const groups = new Map<string, ReservationGroup>()
  for (const reservation of reservations) {
    const key =
      groupBy === 'status'
        ? reservationStatus(reservation)
        : groupBy === 'type'
          ? reservation.type || 'other'
          : reservationDate(reservation) || 'unscheduled'
    const title =
      groupBy === 'status'
        ? reservationStatus(reservation) === 'confirmed'
          ? 'Confirmed'
          : 'Pending'
        : groupBy === 'type'
          ? getType(reservation.type).label
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
