import {
  ArrowLeft,
  ArrowRight,
  Bike,
  Bus,
  Car,
  CarTaxiFront,
  CalendarDays,
  FileText,
  Hotel,
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
import type { Reservation } from '../types'
import { formatLocalSchedule, formatLocalTime, joinLocalDateTime, splitLocalDateTime } from './date'
import type {
  ReservationDetailField,
  ReservationPresentationContext,
  ReservationPresentationContent,
  ReservationPresentationContentPart,
  ReservationPresentationDefinition,
  ReservationProvenance,
} from './types'

function dayDate(dayId: number | null | undefined, context: ReservationPresentationContext) {
  if (dayId == null) return ''
  return context.days.find((day) => day.id === dayId)?.date || ''
}

function accommodationFor(reservation: Reservation, context: ReservationPresentationContext) {
  if (reservation.accommodation_id == null) return undefined
  return context.accommodations.find((item) => Number(item.id) === Number(reservation.accommodation_id))
}

function orderedEndpoints(reservation: Reservation) {
  return (reservation.endpoints || []).slice().sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
}

function metadataFor(reservation: Reservation): Record<string, unknown> {
  if (!reservation.metadata) return {}
  if (typeof reservation.metadata !== 'string') return reservation.metadata
  try {
    const parsed = JSON.parse(reservation.metadata)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function metadataLegs(reservation: Reservation) {
  const legs = metadataFor(reservation).legs
  return Array.isArray(legs)
    ? legs.filter((leg): leg is Record<string, unknown> => Boolean(leg) && typeof leg === 'object')
    : []
}

function pointToPointRoute(reservation: Reservation) {
  const names = orderedEndpoints(reservation)
    .map((endpoint) => endpoint.name)
    .filter((name): name is string => Boolean(name))
  return names.length >= 2 ? [names[0], names[names.length - 1]] : names
}

function multiLegRoute(reservation: Reservation) {
  const endpointNames = orderedEndpoints(reservation)
    .map((endpoint) => endpoint.name)
    .filter((name): name is string => Boolean(name))
  if (endpointNames.length >= 2) return endpointNames

  const legNames = metadataLegs(reservation)
    .flatMap((leg, index) => {
      const from = typeof leg.from === 'string' ? leg.from : null
      const to = typeof leg.to === 'string' ? leg.to : null
      return index === 0 ? [from, to] : [to]
    })
    .filter((name): name is string => Boolean(name))
  if (legNames.length >= 2) return legNames.filter((name, index) => index === 0 || name !== legNames[index - 1])

  const metadata = metadataFor(reservation)
  return [metadata.departure_airport, metadata.arrival_airport].filter(
    (name): name is string => typeof name === 'string' && name.length > 0,
  )
}

/** Maps TREK's external linkage fields to presentation-level provenance. */
function getProvenance(reservation: Reservation): ReservationProvenance {
  if (!reservation.external_source) return { kind: 'manual', provider: null }
  return {
    kind: reservation.sync_enabled ? 'synced' : 'imported',
    provider: reservation.external_source,
  }
}

function titleFrom(reservation: Reservation, route: string[], location: string | null, fallback: string) {
  if (reservation.title) return reservation.title
  if (route.length >= 2) return `${route[0]} to ${route[route.length - 1]}`
  return location || fallback
}

function detailFields(fields: Array<[string, unknown]>): ReservationDetailField[] {
  return fields
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => ({ key, label: key, value: String(value) }))
}

function commonDetailFields(reservation: Reservation) {
  const metadata = metadataFor(reservation)
  return detailFields([
    ['Platform', metadata.platform],
    ['Seat', metadata.seat && metadata.class ? `${metadata.seat} - ${metadata.class}` : metadata.seat],
    [
      'Price',
      metadata.price != null && metadata.price !== ''
        ? `${metadata.price}${metadata.priceCurrency ? ` ${metadata.priceCurrency}` : ''}`
        : '',
    ],
  ])
}

type ScheduleBoundary = (reservation: Reservation, context: ReservationPresentationContext) => string | null
type TripDaysOptions = {
  describeTripOverlap?: boolean
  fallbackText?: string
  showMissingEnd?: boolean
}

/**
 * Builds stable, rich trip-relative content from a type's canonical start and end.
 * Part order controls inline icon placement while text-only surfaces can flatten it.
 */
function tripDaysDisplay(
  reservation: Reservation,
  context: ReservationPresentationContext,
  getStart: ScheduleBoundary,
  getEnd: ScheduleBoundary,
  { describeTripOverlap = false, fallbackText, showMissingEnd = false }: TripDaysOptions = {},
): ReservationPresentationContent | null {
  const startDate = getStart(reservation, context)?.slice(0, 10)
  if (!startDate) return fallbackText || null
  const endDate = getEnd(reservation, context)?.slice(0, 10) || startDate

  const formatDate = (value: string) =>
    new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    })
  const dayForDate = (date: string) => context.days.find((day) => day.date === date)
  const displayDay = (date: string, fallback: string) => {
    const day = dayForDate(date)
    return day?.title || (day ? `Day ${day.day_number || ''}`.trim() : fallback)
  }
  const tripStart = context.trip?.start_date?.split(/[T ]/)[0]
  const tripEnd = context.trip?.end_date?.split(/[T ]/)[0]
  const dayNumber = (date: string) => {
    if (!tripStart) return null
    return Math.floor((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${tripStart}T00:00:00Z`)) / 86_400_000) + 1
  }

  if (describeTripOverlap && tripStart && tripEnd) {
    const isBefore = endDate < tripStart
    const endsDuring = startDate < tripStart && endDate >= tripStart
    const startsDuring = endDate > tripEnd && startDate <= tripEnd
    const isAfter = startDate > tripEnd
    const spansTrip = endsDuring && startsDuring
    if (isBefore || isAfter || spansTrip || endsDuring || startsDuring) {
      const relationIcon = isBefore
        ? ArrowLeft
        : isAfter
          ? ArrowRight
          : spansTrip
            ? ArrowRight
            : endsDuring
              ? ArrowLeft
              : ArrowRight
      if (spansTrip) {
        return [
          { kind: 'icon', Icon: CalendarDays },
          { kind: 'icon', Icon: ArrowLeft },
          { kind: 'muted', value: '–' },
          { kind: 'icon', Icon: ArrowRight },
          { kind: 'icon', Icon: CalendarDays },
        ]
      }
      if (isBefore || isAfter)
        return [
          { kind: 'icon', Icon: CalendarDays },
          { kind: 'icon', Icon: relationIcon },
        ]

      const relatedDate = endsDuring ? endDate : startDate
      const relatedDayNumber = dayNumber(relatedDate)
      const relatedDay = displayDay(relatedDate, relatedDayNumber ? `Day ${relatedDayNumber}` : '')
      const tripDay = relatedDay
        ? [
            { kind: 'strong' as const, value: relatedDay },
            { kind: 'text' as const, value: formatDate(relatedDate) },
          ]
        : []
      return endsDuring
        ? [
            { kind: 'icon', Icon: CalendarDays },
            { kind: 'icon', Icon: relationIcon },
            { kind: 'muted', value: '–' },
            ...tripDay,
          ]
        : [
            ...tripDay,
            { kind: 'muted', value: '–' },
            { kind: 'icon', Icon: relationIcon },
            { kind: 'icon', Icon: CalendarDays },
          ]
    }
  }

  const startDay = dayForDate(startDate)
  const linkedEndDay = endDate ? dayForDate(endDate) : undefined
  const startDayNumber = dayNumber(startDate)
  const endDayNumber = endDate ? dayNumber(endDate) : null
  const start: ReservationPresentationContentPart[] = [
    {
      kind: 'strong',
      value: displayDay(startDate, startDayNumber && startDayNumber > 0 ? `Day ${startDayNumber}` : 'Day'),
    },
    { kind: 'text', value: formatDate(startDate) },
  ]
  const end: ReservationPresentationContentPart[] | null =
    linkedEndDay?.id !== startDay?.id && endDate
      ? [
          { kind: 'muted', value: '–' },
          {
            kind: 'strong',
            value: displayDay(endDate, endDayNumber && endDayNumber > 0 ? `Day ${endDayNumber}` : 'Day'),
          },
          { kind: 'text', value: formatDate(endDate) },
        ]
      : showMissingEnd
        ? [
            { kind: 'muted', value: '–' },
            { kind: 'strong', value: 'Day' },
            { kind: 'text', value: '—' },
          ]
        : null
  return end ? [...start, ...end] : start
}

function getTripDaysContent(
  reservation: Reservation,
  context: ReservationPresentationContext,
  getStart: ScheduleBoundary,
  getEnd: ScheduleBoundary,
  options?: TripDaysOptions,
) {
  return tripDaysDisplay(reservation, context, getStart, getEnd, options)
}

// ── Shared storage-pattern functions ──────────────────────────────────────

/** Flights and trains prioritize endpoint-local times, then stored reservation values. */
const flightTrainPresentation = {
  getProvenance,
  category: 'transportation' as const,
  getTitle: (reservation: Reservation) =>
    titleFrom(
      reservation,
      multiLegRoute(reservation),
      null,
      reservation.type === 'train' ? 'Train reservation' : 'Flight reservation',
    ),
  getStart: (reservation: Reservation, context: ReservationPresentationContext) => {
    const endpoint = orderedEndpoints(reservation)[0]
    const stored = splitLocalDateTime(reservation.reservation_time)
    const leg = metadataLegs(reservation)[0]
    const legTime = typeof leg?.dep_time === 'string' ? leg.dep_time : ''
    return joinLocalDateTime(
      endpoint?.local_date || stored.date || dayDate(reservation.day_id, context),
      endpoint?.local_time || stored.time || legTime,
    )
  },
  getEnd: (reservation: Reservation, context: ReservationPresentationContext) => {
    const endpoints = orderedEndpoints(reservation)
    const endpoint = endpoints.length > 1 ? endpoints.at(-1) : undefined
    const stored = splitLocalDateTime(reservation.reservation_end_time)
    const legs = metadataLegs(reservation)
    const leg = legs.at(-1)
    const legTime = typeof leg?.arr_time === 'string' ? leg.arr_time : ''
    return joinLocalDateTime(
      endpoint?.local_date || stored.date || dayDate(reservation.end_day_id, context),
      endpoint?.local_time || stored.time || legTime,
    )
  },
  getScheduleContent: (reservation: Reservation, context: ReservationPresentationContext) =>
    formatLocalSchedule(
      flightTrainPresentation.getStart(reservation, context),
      flightTrainPresentation.getEnd(reservation, context),
    ),
  getTripDaysContent: (reservation: Reservation, context: ReservationPresentationContext) =>
    getTripDaysContent(reservation, context, flightTrainPresentation.getStart, flightTrainPresentation.getEnd, {
      fallbackText: 'Day · —',
    }),
  getRoute: (reservation: Reservation) => multiLegRoute(reservation),
  getLocation: () => null,
  getDetailFields: (reservation: Reservation) => {
    const metadata = metadataFor(reservation)
    return [
      ...detailFields([
        ['Airline', metadata.airline],
        ['Flight', metadata.flight_number],
        ['Train', metadata.train_number],
      ]),
      ...commonDetailFields(reservation),
    ]
  },
} as const

/** Automated transit writes its planned start/end to the reservation row; stops are fallbacks. */
const automatedTransitPresentation = {
  getProvenance,
  category: 'transportation' as const,
  getTitle: (reservation: Reservation) =>
    titleFrom(reservation, automatedTransitPresentation.getRoute(reservation), null, 'Transit reservation'),
  getStart: (reservation: Reservation, context: ReservationPresentationContext) => {
    const stored = splitLocalDateTime(reservation.reservation_time)
    const endpoint = orderedEndpoints(reservation)[0]
    return joinLocalDateTime(
      stored.date || endpoint?.local_date || dayDate(reservation.day_id, context),
      stored.time || endpoint?.local_time,
    )
  },
  getEnd: (reservation: Reservation, context: ReservationPresentationContext) => {
    const stored = splitLocalDateTime(reservation.reservation_end_time)
    const endpoints = orderedEndpoints(reservation)
    const endpoint = endpoints.length > 1 ? endpoints.at(-1) : undefined
    return joinLocalDateTime(
      stored.date || endpoint?.local_date || dayDate(reservation.end_day_id, context),
      stored.time || endpoint?.local_time,
    )
  },
  getScheduleContent: (reservation: Reservation, context: ReservationPresentationContext) =>
    formatLocalSchedule(
      automatedTransitPresentation.getStart(reservation, context),
      automatedTransitPresentation.getEnd(reservation, context),
    ),
  getTripDaysContent: (reservation: Reservation, context: ReservationPresentationContext) =>
    getTripDaysContent(
      reservation,
      context,
      automatedTransitPresentation.getStart,
      automatedTransitPresentation.getEnd,
      {
        fallbackText: 'Day · —',
      },
    ),
  getRoute: (reservation: Reservation) =>
    orderedEndpoints(reservation)
      .map((endpoint) => endpoint.name)
      .filter((name): name is string => Boolean(name)),
  getLocation: () => null,
  getDetailFields: commonDetailFields,
} as const

/** Manual point-to-point transport uses reservation values and linked itinerary days before endpoint fallbacks. */
const transportationPresentation = {
  getProvenance,
  category: 'transportation' as const,
  getTitle: (reservation: Reservation) =>
    titleFrom(reservation, pointToPointRoute(reservation), null, 'Transportation reservation'),
  getStart: (reservation: Reservation, context: ReservationPresentationContext) => {
    const stored = splitLocalDateTime(reservation.reservation_time)
    const endpoint = orderedEndpoints(reservation)[0]
    return joinLocalDateTime(
      stored.date || dayDate(reservation.day_id, context) || endpoint?.local_date,
      stored.time || endpoint?.local_time,
    )
  },
  getEnd: (reservation: Reservation, context: ReservationPresentationContext) => {
    const stored = splitLocalDateTime(reservation.reservation_end_time)
    const endpoints = orderedEndpoints(reservation)
    const endpoint = endpoints.length > 1 ? endpoints.at(-1) : undefined
    return joinLocalDateTime(
      stored.date || dayDate(reservation.end_day_id, context) || endpoint?.local_date,
      stored.time || endpoint?.local_time,
    )
  },
  getScheduleContent: (reservation: Reservation, context: ReservationPresentationContext) =>
    formatLocalSchedule(
      transportationPresentation.getStart(reservation, context),
      transportationPresentation.getEnd(reservation, context),
    ),
  getTripDaysContent: (reservation: Reservation, context: ReservationPresentationContext) =>
    getTripDaysContent(reservation, context, transportationPresentation.getStart, transportationPresentation.getEnd, {
      fallbackText: 'Day · —',
    }),
  getRoute: (reservation: Reservation) => pointToPointRoute(reservation),
  getLocation: () => null,
  getDetailFields: commonDetailFields,
} as const

/** Accommodation schedule boundaries are stay dates; check-in/out remain reference detail fields. */
const accommodationPresentation = {
  getProvenance,
  category: 'accommodation' as const,
  getTitle: (reservation: Reservation, context: ReservationPresentationContext) =>
    titleFrom(reservation, [], accommodationPresentation.getLocation(reservation), 'Accommodation reservation'),
  getStart: (reservation: Reservation, context: ReservationPresentationContext) => {
    const accommodation = accommodationFor(reservation, context)
    const stored = splitLocalDateTime(reservation.reservation_time)
    return joinLocalDateTime(
      dayDate(accommodation?.start_day_id, context) || stored.date || dayDate(reservation.day_id, context),
      '',
    )
  },
  getEnd: (reservation: Reservation, context: ReservationPresentationContext) => {
    const accommodation = accommodationFor(reservation, context)
    const stored = splitLocalDateTime(reservation.reservation_end_time)
    return joinLocalDateTime(
      dayDate(accommodation?.end_day_id, context) || stored.date || dayDate(reservation.end_day_id, context),
      '',
    )
  },
  getScheduleContent: (reservation: Reservation, context: ReservationPresentationContext) =>
    formatLocalSchedule(
      accommodationPresentation.getStart(reservation, context),
      accommodationPresentation.getEnd(reservation, context),
    ),
  getTripDaysContent: (reservation: Reservation, context: ReservationPresentationContext) =>
    getTripDaysContent(reservation, context, accommodationPresentation.getStart, accommodationPresentation.getEnd, {
      fallbackText: 'Day · — – Day · —',
      showMissingEnd: true,
    }),
  getRoute: () => [],
  getLocation: (reservation: Reservation) =>
    reservation.accommodation_name || reservation.location || reservation.place_name || null,
  getDetailFields: (reservation: Reservation, context: ReservationPresentationContext) => {
    const accommodation = accommodationFor(reservation, context)
    return [
      ...detailFields([
        ['Check-in', formatLocalTime(accommodation?.check_in)],
        ['Check-out', formatLocalTime(accommodation?.check_out)],
      ]).map((field) => ({ ...field, cardAlignment: 'center' as const })),
      ...commonDetailFields(reservation),
    ]
  },
} as const

/** Restaurants are single-date bookings; an end time without a date remains on the start date. */
const restaurantPresentation = {
  getProvenance,
  category: 'booking' as const,
  getTitle: (reservation: Reservation, context: ReservationPresentationContext) =>
    titleFrom(reservation, [], restaurantPresentation.getLocation(reservation), 'Restaurant reservation'),
  getStart: (reservation: Reservation, context: ReservationPresentationContext) => {
    const stored = splitLocalDateTime(reservation.reservation_time)
    return joinLocalDateTime(stored.date || dayDate(reservation.day_id, context), stored.time)
  },
  getEnd: (reservation: Reservation, context: ReservationPresentationContext) => {
    const start = splitLocalDateTime(reservation.reservation_time)
    const end = splitLocalDateTime(reservation.reservation_end_time)
    return joinLocalDateTime(end.date || start.date || dayDate(reservation.day_id, context), end.time)
  },
  getScheduleContent: (reservation: Reservation, context: ReservationPresentationContext) =>
    formatLocalSchedule(
      restaurantPresentation.getStart(reservation, context),
      restaurantPresentation.getEnd(reservation, context),
    ),
  getTripDaysContent: (reservation: Reservation, context: ReservationPresentationContext) =>
    getTripDaysContent(reservation, context, restaurantPresentation.getStart, restaurantPresentation.getEnd, {
      describeTripOverlap: true,
    }),
  getRoute: () => [],
  getLocation: (reservation: Reservation) => reservation.location || reservation.place_name || null,
  getDetailFields: commonDetailFields,
} as const

/** Events, tours, and generic bookings use their stored start/end values with day-link fallbacks. */
const bookingPresentation = {
  getProvenance,
  category: 'booking' as const,
  getTitle: (reservation: Reservation, context: ReservationPresentationContext) =>
    titleFrom(reservation, [], bookingPresentation.getLocation(reservation), 'Reservation'),
  getStart: (reservation: Reservation, context: ReservationPresentationContext) => {
    const stored = splitLocalDateTime(reservation.reservation_time)
    return joinLocalDateTime(stored.date || dayDate(reservation.day_id, context), stored.time)
  },
  getEnd: (reservation: Reservation, context: ReservationPresentationContext) => {
    const stored = splitLocalDateTime(reservation.reservation_end_time)
    return joinLocalDateTime(stored.date || dayDate(reservation.end_day_id, context), stored.time)
  },
  getScheduleContent: (reservation: Reservation, context: ReservationPresentationContext) =>
    formatLocalSchedule(
      bookingPresentation.getStart(reservation, context),
      bookingPresentation.getEnd(reservation, context),
    ),
  getTripDaysContent: (reservation: Reservation, context: ReservationPresentationContext) =>
    getTripDaysContent(reservation, context, bookingPresentation.getStart, bookingPresentation.getEnd, {
      describeTripOverlap: true,
    }),
  getRoute: () => [],
  getLocation: (reservation: Reservation) => reservation.location || reservation.place_name || null,
  getDetailFields: commonDetailFields,
} as const

/**
 * Presentation rulebook for every reservation type supported by this plugin.
 * Each type declares its visual identity here and composes the local function
 * set that matches how TREK stores that type's scheduling data.
 */
export const RESERVATION_PRESENTATIONS = {
  // ── Transportation ──────────────────────────────────────────────────────
  flight: { type: 'flight', label: 'Flight', Icon: Plane, color: '#3b82f6', ...flightTrainPresentation },
  train: { type: 'train', label: 'Train', Icon: Train, color: '#06b6d4', ...flightTrainPresentation },
  transit: { type: 'transit', label: 'Transit', Icon: TramFront, color: '#7c3aed', ...automatedTransitPresentation },
  bus: { type: 'bus', label: 'Bus', Icon: Bus, color: '#059669', ...transportationPresentation },
  car: { type: 'car', label: 'Car', Icon: Car, color: '#6b7280', ...transportationPresentation },
  taxi: { type: 'taxi', label: 'Taxi', Icon: CarTaxiFront, color: '#ca8a04', ...transportationPresentation },
  bicycle: { type: 'bicycle', label: 'Bicycle', Icon: Bike, color: '#84cc16', ...transportationPresentation },
  cruise: { type: 'cruise', label: 'Cruise', Icon: Ship, color: '#0ea5e9', ...transportationPresentation },
  ferry: { type: 'ferry', label: 'Ferry', Icon: Sailboat, color: '#0d9488', ...transportationPresentation },
  transport_other: {
    type: 'transport_other',
    label: 'Other',
    Icon: Route,
    color: '#6b7280',
    ...transportationPresentation,
  },

  // ── Accommodation ───────────────────────────────────────────────────────
  hotel: { type: 'hotel', label: 'Accommodation', Icon: Hotel, color: '#8b5cf6', ...accommodationPresentation },

  // ── Bookings ────────────────────────────────────────────────────────────
  restaurant: { type: 'restaurant', label: 'Restaurant', Icon: Utensils, color: '#ef4444', ...restaurantPresentation },
  event: { type: 'event', label: 'Event', Icon: Ticket, color: '#f59e0b', ...bookingPresentation },
  tour: { type: 'tour', label: 'Tour', Icon: Users, color: '#10b981', ...bookingPresentation },
  other: { type: 'other', label: 'Other', Icon: FileText, color: '#6b7280', ...bookingPresentation },
} satisfies Record<string, ReservationPresentationDefinition>

export type ReservationPresentationType = keyof typeof RESERVATION_PRESENTATIONS
