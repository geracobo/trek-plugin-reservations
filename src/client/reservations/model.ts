import {
  Bike,
  Bus,
  Car,
  CarTaxiFront,
  FileText,
  Hotel,
  LucideIcon,
  Plane,
  Route,
  Sailboat,
  Ship,
  Ticket,
  Train,
  TramFront,
  Users,
  Utensils,
} from 'lucide-react'
import type { Reservation, StatusFilter } from './types'

export const TRANSPORT_TYPES = new Set([
  'flight',
  'train',
  'bus',
  'car',
  'taxi',
  'bicycle',
  'cruise',
  'ferry',
  'transit',
  'transport_other',
])

export interface TypeOption {
  value: string
  label: string
  Icon: LucideIcon
  color: string
}

export const TYPE_OPTIONS: TypeOption[] = [
  { value: 'flight', label: 'Flight', Icon: Plane, color: '#3b82f6' },
  { value: 'hotel', label: 'Accommodation', Icon: Hotel, color: '#8b5cf6' },
  { value: 'restaurant', label: 'Restaurant', Icon: Utensils, color: '#ef4444' },
  { value: 'train', label: 'Train', Icon: Train, color: '#06b6d4' },
  { value: 'bus', label: 'Bus', Icon: Bus, color: '#059669' },
  { value: 'car', label: 'Car', Icon: Car, color: '#6b7280' },
  { value: 'taxi', label: 'Taxi', Icon: CarTaxiFront, color: '#ca8a04' },
  { value: 'bicycle', label: 'Bicycle', Icon: Bike, color: '#84cc16' },
  { value: 'cruise', label: 'Cruise', Icon: Ship, color: '#0ea5e9' },
  { value: 'ferry', label: 'Ferry', Icon: Sailboat, color: '#0d9488' },
  { value: 'transit', label: 'Transit', Icon: TramFront, color: '#7c3aed' },
  { value: 'transport_other', label: 'Other transport', Icon: Route, color: '#6b7280' },
  { value: 'event', label: 'Event', Icon: Ticket, color: '#f59e0b' },
  { value: 'tour', label: 'Tour', Icon: Users, color: '#10b981' },
  { value: 'other', label: 'Other', Icon: FileText, color: '#6b7280' },
]

export function getType(type: string | null | undefined): TypeOption {
  return TYPE_OPTIONS.find((option) => option.value === type) ?? TYPE_OPTIONS[TYPE_OPTIONS.length - 1]
}

export function splitReservationDateTime(value: string | null | undefined) {
  if (!value) return { date: '', time: '' }
  const [date = '', rawTime = ''] = value.split(/[T ]/)
  return { date, time: rawTime.slice(0, 5) }
}

export function formatReservationDate(date: string) {
  if (!date) return ''
  try {
    return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    })
  } catch {
    return date
  }
}

export function formatReservationTime(time: string) {
  if (!time) return ''
  const [hours, minutes] = time.split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return time
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
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
  const endpoints = (reservation.endpoints ?? [])
    .slice()
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
    .map((endpoint) => endpoint.name)
    .filter((name): name is string => Boolean(name))
  if (endpoints.length >= 2) return endpoints

  const metadata = normalizeMetadata(reservation)
  if (Array.isArray(metadata.legs)) {
    const stops = metadata.legs.flatMap((leg, index) => {
      if (!leg || typeof leg !== 'object') return []
      const typedLeg = leg as Record<string, unknown>
      const from = typeof typedLeg.from === 'string' ? typedLeg.from : null
      const to = typeof typedLeg.to === 'string' ? typedLeg.to : null
      return index === 0 ? [from, to] : [to]
    }).filter((name): name is string => Boolean(name))
    if (stops.length >= 2) return stops.filter((name, index) => index === 0 || name !== stops[index - 1])
  }

  const metadataStops = [metadata.departure_airport, metadata.arrival_airport]
    .filter((name): name is string => typeof name === 'string' && name.length > 0)
  if (metadataStops.length >= 2) return metadataStops

  const titleRoute = reservation.title?.match(/\s[-–—]\s(.+?)\s+to\s+(.+)$/i)
  return titleRoute ? [titleRoute[1], titleRoute[2]] : []
}

export function reservationStatus(reservation: Reservation): Exclude<StatusFilter, 'all'> {
  return reservation.status === 'confirmed' ? 'confirmed' : 'pending'
}

export function reservationTitle(reservation: Reservation) {
  if (reservation.title) return reservation.title
  const route = reservationRoute(reservation)
  if (route.length >= 2) return `${route[0]} to ${route[route.length - 1]}`
  return `${getType(reservation.type).label} reservation`
}

export function reservationDate(reservation: Reservation) {
  return splitReservationDateTime(reservation.reservation_time).date
}

export function reservationDateRange(reservation: Reservation) {
  const start = splitReservationDateTime(reservation.reservation_time).date
  const end = splitReservationDateTime(reservation.reservation_end_time).date
  const formattedStart = formatReservationDate(start)
  const formattedEnd = formatReservationDate(end)
  if (formattedStart && formattedEnd && end !== start) return `${formattedStart} - ${formattedEnd}`
  return formattedStart || formattedEnd
}

export function reservationTimeRange(reservation: Reservation) {
  let start = splitReservationDateTime(reservation.reservation_time).time
  let end = splitReservationDateTime(reservation.reservation_end_time).time
  if (!start && !end) {
    const metadata = normalizeMetadata(reservation)
    const legs = Array.isArray(metadata.legs) ? metadata.legs.filter((leg): leg is Record<string, unknown> => Boolean(leg) && typeof leg === 'object') : []
    const first = legs[0]
    const last = legs[legs.length - 1]
    start = typeof first?.dep_time === 'string' ? first.dep_time : ''
    end = typeof last?.arr_time === 'string' ? last.arr_time : ''
  }
  const formattedStart = formatReservationTime(start)
  const formattedEnd = formatReservationTime(end)
  if (formattedStart && formattedEnd) return `${formattedStart} - ${formattedEnd}`
  return formattedStart || formattedEnd
}

export function metadataFields(reservation: Reservation) {
  const meta = normalizeMetadata(reservation)
  const route = reservationRoute(reservation)
  const fields: Array<{ label: string; value: string }> = []
  const add = (label: string, value: unknown) => {
    if (value !== undefined && value !== null && value !== '') {
      fields.push({ label, value: String(value) })
    }
  }

  add('Airline', meta.airline)
  add('Flight', meta.flight_number)
  if (route.length < 2) {
    add('From', meta.departure_airport)
    add('To', meta.arrival_airport)
  }
  add('Train', meta.train_number)
  add('Platform', meta.platform)
  add('Seat', meta.seat && meta.class ? `${meta.seat} - ${meta.class}` : meta.seat)
  add('Check-in', meta.check_in_time ? formatReservationTime(String(meta.check_in_time)) : '')
  add('Check-out', meta.check_out_time ? formatReservationTime(String(meta.check_out_time)) : '')
  add('Price', meta.price != null && meta.price !== '' ? `${meta.price}${meta.priceCurrency ? ` ${meta.priceCurrency}` : ''}` : '')
  if (reservation.type === 'hotel') add('Accommodation', reservation.accommodation_name || reservation.location || reservation.place_name || reservationTitle(reservation))
  else add('Location', reservation.location || reservation.place_name)

  return fields
}

export function filterAndSortReservations(
  reservations: Reservation[],
  selectedTypes: Set<string>,
  statusFilter: StatusFilter,
) {
  return reservations
    .filter((reservation) => selectedTypes.size === 0 || selectedTypes.has(reservation.type ?? 'other'))
    .filter((reservation) => statusFilter === 'all' || reservationStatus(reservation) === statusFilter)
    .slice()
    .sort((a, b) => reservationDate(a).localeCompare(reservationDate(b)) || reservationTimeRange(a).localeCompare(reservationTimeRange(b)) || reservationTitle(a).localeCompare(reservationTitle(b)))
}
