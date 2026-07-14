import {
  ArrowLeft,
  ArrowRight,
  ArrowRightFromLine,
  ArrowRightToLine,
  CalendarDays,
  ChevronRight,
  Footprints,
  Plane,
} from 'lucide-react'
import type { Accommodation, Day, Reservation, Trip } from '../types'
import {
  normalizeMetadata,
  reservationDateRange,
  reservationRoute,
  reservationTimeRange,
  TRANSPORT_TYPES,
} from '../model'
import { ReservationCardField } from './ReservationCardField'
import type { CardFieldKey } from './ReservationCardSections'

type BookingTripRelation = 'before' | 'ends-during' | 'spans-trip' | 'starts-during' | 'after' | null

type DaySummary = {
  day: string
  date: string
  endDay: string | null
  endDate: string | null
  outsideTrip: BookingTripRelation
}

interface ReservationCardScheduleProps {
  reservation: Reservation
  trip: Trip | null
  days: Day[]
  accommodations: Accommodation[]
  visibleFields: Set<CardFieldKey>
}

function bookingTripRelation(reservation: Reservation, trip: Trip | null): BookingTripRelation {
  if (TRANSPORT_TYPES.has(reservation.type ?? '') || reservation.type === 'hotel') return null
  const start = reservation.reservation_time?.split(/[T ]/)[0]
  const end = reservation.reservation_end_time?.split(/[T ]/)[0] || start
  const tripStart = trip?.start_date?.split(/[T ]/)[0]
  const tripEnd = trip?.end_date?.split(/[T ]/)[0]
  if (!start || !end || !tripStart || !tripEnd) return null

  const fullyBeforeTrip = end < tripStart
  const endsDuringTrip = start < tripStart
  const startsDuringTrip = end > tripEnd
  const fullyAfterTrip = start > tripEnd

  if (fullyBeforeTrip) return 'before'
  if (fullyAfterTrip) return 'after'
  if (endsDuringTrip && startsDuringTrip) return 'spans-trip'
  if (endsDuringTrip) return 'ends-during'
  if (startsDuringTrip) return 'starts-during'
  return null
}

function daySummary(
  reservation: Reservation,
  trip: Trip | null,
  days: Day[],
  accommodations: Accommodation[],
): DaySummary | null {
  const reservationDate = reservation.reservation_time?.split(/[T ]/)[0]
  const reservationEndDate = reservation.reservation_end_time?.split(/[T ]/)[0] || reservationDate
  const relation = bookingTripRelation(reservation, trip)
  const shortDate = (value: string) =>
    new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    })
  if (relation) {
    const relatedDate =
      relation === 'ends-during' ? reservationEndDate : relation === 'starts-during' ? reservationDate : null
    const relatedDay = relatedDate ? days.find((day) => day.date === relatedDate) : undefined
    const tripStart = trip?.start_date?.split(/[T ]/)[0]
    const relatedDayNumber =
      relatedDate && tripStart
        ? Math.floor((Date.parse(`${relatedDate}T00:00:00Z`) - Date.parse(`${tripStart}T00:00:00Z`)) / 86_400_000) + 1
        : null

    return {
      day: relatedDay?.title || (relatedDayNumber ? `Day ${relatedDayNumber}` : ''),
      date: relatedDate ? shortDate(relatedDate) : '',
      endDay: null,
      endDate: null,
      outsideTrip: relation,
    }
  }

  const accommodation =
    reservation.type === 'hotel' && reservation.accommodation_id
      ? accommodations.find((item) => item.id === reservation.accommodation_id)
      : undefined
  const startDayId = accommodation?.start_day_id || reservation.day_id
  const endDayId = accommodation?.end_day_id || reservation.end_day_id
  const startDay = startDayId ? days.find((day) => day.id === startDayId) : undefined
  const linkedEndDay = endDayId ? days.find((day) => day.id === endDayId) : undefined
  if (startDay?.date) {
    return {
      day: startDay.title || `Day ${startDay.day_number || ''}`.trim(),
      date: shortDate(startDay.date),
      endDay:
        linkedEndDay?.id !== startDay.id
          ? linkedEndDay?.title || (linkedEndDay ? `Day ${linkedEndDay.day_number || ''}`.trim() : null)
          : null,
      endDate: linkedEndDay?.id !== startDay.id && linkedEndDay?.date ? shortDate(linkedEndDay.date) : null,
      outsideTrip: null,
    }
  }

  const startValue = reservationDate
  if (!startValue) return null
  const startDate = new Date(`${startValue}T00:00:00Z`)
  if (Number.isNaN(startDate.getTime())) return null
  const formatDate = (date: Date) =>
    date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })
  const endValue = reservation.reservation_end_time?.split(/[T ]/)[0]
  const endDate = endValue ? new Date(`${endValue}T00:00:00Z`) : null
  const validEndDate = endDate && !Number.isNaN(endDate.getTime()) ? endDate : null
  const tripStart = trip?.start_date?.split(/[T ]/)[0]
  if (!tripStart) {
    return {
      day: 'Day',
      date: formatDate(startDate),
      endDay: null,
      endDate: validEndDate ? formatDate(validEndDate) : null,
      outsideTrip: null,
    }
  }

  const start = new Date(`${tripStart}T00:00:00Z`)
  const dayNumber = (date: Date) => Math.floor((date.getTime() - start.getTime()) / 86_400_000) + 1
  const day = dayNumber(startDate)
  const endDay = validEndDate ? dayNumber(validEndDate) : null
  return {
    day: day > 0 ? `Day ${day}` : 'Day',
    date: formatDate(startDate),
    endDay: endDay && endDay > 0 ? `Day ${endDay}` : null,
    endDate: validEndDate ? formatDate(validEndDate) : null,
    outsideTrip: null,
  }
}

function TripDaysValue({ summary, fallbackDay }: { summary: DaySummary | null; fallbackDay?: string }) {
  if (!summary) return <strong>{fallbackDay || '—'}</strong>
  if (!summary.outsideTrip) {
    return (
      <>
        <strong>{fallbackDay || summary.day || '—'}</strong>
        <span>{summary.date}</span>
      </>
    )
  }

  const endsDuringTrip = summary.outsideTrip === 'ends-during'
  const startsDuringTrip = summary.outsideTrip === 'starts-during'
  const spansTrip = summary.outsideTrip === 'spans-trip'
  const label =
    summary.outsideTrip === 'before'
      ? 'Before trip'
      : summary.outsideTrip === 'after'
        ? 'After trip'
        : spansTrip
          ? 'Spans entire trip'
          : endsDuringTrip
            ? 'Ends during trip'
            : 'Starts during trip'

  return (
    <span className="inline-flex flex-wrap items-center justify-center gap-1.5 font-semibold">
      <CalendarDays size={14} />
      {spansTrip ? (
        <>
          <ArrowLeft size={14} />
          <ArrowRight size={14} />
        </>
      ) : endsDuringTrip ? (
        <ArrowRightToLine size={14} />
      ) : startsDuringTrip ? (
        <ArrowRightFromLine size={14} />
      ) : summary.outsideTrip === 'before' ? (
        <ArrowLeft size={14} />
      ) : (
        <ArrowRight size={14} />
      )}
      <span>{label}</span>
      {(endsDuringTrip || startsDuringTrip) && summary.day ? (
        <>
          <span className="text-content-muted">·</span>
          <strong>{summary.day}</strong>
          <span>{summary.date}</span>
        </>
      ) : null}
    </span>
  )
}

function RouteField({ route, Icon }: { route: string[]; Icon: typeof Plane }) {
  if (route.length < 2) return null
  return (
    <div className="min-w-0">
      <div className="mb-[5px] text-[10px] font-extrabold uppercase text-content-faint">Route</div>
      <div className="flex flex-wrap items-center justify-center gap-2 rounded-[10px] bg-surface-muted px-3 py-2 text-[12.5px] text-content">
        {route.map((name, index) => (
          <span className="inline-flex min-w-0 items-center gap-2 font-semibold" key={`${name}-${index}`}>
            {index > 0 ? <Icon className="shrink-0 text-[var(--reservation-color)]" size={14} /> : null}
            <span className="truncate">{name}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function FlightDetails({
  reservation,
  trip,
  days,
  accommodations,
}: Omit<ReservationCardScheduleProps, 'visibleFields'>) {
  const summary = daySummary(reservation, trip, days, accommodations)
  const metadata = normalizeMetadata(reservation)
  const endpointRoute = reservationRoute(reservation)
  const route =
    endpointRoute.length >= 2
      ? endpointRoute
      : [metadata.departure_airport, metadata.arrival_airport].filter(
          (value): value is string => typeof value === 'string' && value.length > 0,
        )

  return (
    <>
      <TripDays
        summary={summary}
        fallbackDay={typeof metadata.day_title === 'string' ? metadata.day_title : undefined}
      />
      <div className="grid grid-cols-2 gap-2.5 [&>div>div:last-child]:text-center">
        <ReservationCardField label="Date" value={reservationDateRange(reservation)} centered />
        <ReservationCardField label="Time" value={reservationTimeRange(reservation)} centered />
      </div>
      <div className="[&>div>div:last-child]:text-center">
        <ReservationCardField label="Booking code" value={reservation.confirmation_number || '—'} mono />
      </div>
      <RouteField route={route} Icon={Plane} />
    </>
  )
}

function TripDays({ summary, fallbackDay }: { summary: DaySummary | null; fallbackDay?: string }) {
  return (
    <div className="min-w-0">
      <div className="mb-[5px] text-center text-[10px] font-extrabold uppercase text-content-faint">Trip days</div>
      <div className="flex min-h-9 items-center justify-center gap-3 rounded-[10px] bg-surface-muted px-3 py-2 text-xs text-content">
        <TripDaysValue summary={summary} fallbackDay={fallbackDay} />
        {summary?.endDay && summary.endDate ? (
          <>
            <span className="text-content-muted">–</span>
            <strong>{summary.endDay}</strong>
            <span>{summary.endDate}</span>
          </>
        ) : null}
      </div>
    </div>
  )
}

type TransitLeg = {
  mode?: string
  line?: string | null
  line_color?: string | null
  line_text_color?: string | null
  duration?: number
}

function TransitLegChips({ reservation }: { reservation: Reservation }) {
  const metadata = normalizeMetadata(reservation)
  const transit = metadata.transit
  const transitMetadata = transit && typeof transit === 'object' ? (transit as Record<string, unknown>) : null
  const rawLegs = Array.isArray(transitMetadata?.legs)
    ? transitMetadata.legs
    : Array.isArray(metadata.legs)
      ? metadata.legs
      : []
  const legs = rawLegs
    .filter((leg): leg is TransitLeg => Boolean(leg) && typeof leg === 'object')
    .filter((leg) => leg.mode !== 'WALK' || (leg.duration || 0) >= 60)
  if (legs.length === 0) return null

  return (
    <div className="min-w-0">
      <div className="mb-[5px] text-[10px] font-extrabold uppercase text-content-faint">Route</div>
      <div className="flex min-h-[34px] flex-wrap items-center justify-center gap-1.5 rounded-[10px] bg-surface-muted px-2.5 py-2 text-[11px]">
        {legs.map((leg, index) => (
          <span className="inline-flex items-center gap-1.5" key={`${leg.mode}-${leg.line}-${index}`}>
            {index > 0 ? <ChevronRight className="text-content-faint" size={12} /> : null}
            {leg.mode === 'WALK' ? (
              <span className="inline-flex items-center gap-0.5 font-semibold text-content-faint">
                <Footprints size={13} />
                {Math.round((leg.duration || 0) / 60)}
              </span>
            ) : (
              <span
                className="rounded-[5px] px-1.5 py-0.5 text-[10.5px] font-bold leading-none"
                style={{
                  background: leg.line_color || 'var(--bg-tertiary)',
                  color: leg.line_color ? leg.line_text_color || '#fff' : 'var(--text-primary)',
                }}
              >
                {leg.line || leg.mode}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}

export function ReservationCardSchedule({
  reservation,
  trip,
  days,
  accommodations,
  visibleFields,
}: ReservationCardScheduleProps) {
  if (!visibleFields.has('schedule') && !visibleFields.has('location')) return null
  const isFlight = reservation.type === 'flight'
  const isAccommodation = reservation.type === 'hotel'
  const isAutomatedTransit = reservation.type === 'transit'
  const summary = daySummary(reservation, trip, days, accommodations)
  const visibleSummary = summary
    ? isAccommodation && !summary.endDay
      ? { ...summary, endDay: 'Day', endDate: '—' }
      : summary
    : TRANSPORT_TYPES.has(reservation.type ?? '') || isAccommodation
      ? {
          day: 'Day',
          date: '—',
          endDay: isAccommodation ? 'Day' : null,
          endDate: isAccommodation ? '—' : null,
          outsideTrip: null,
        }
      : null

  return (
    <>
      {isFlight && visibleFields.has('schedule') ? (
        <FlightDetails reservation={reservation} trip={trip} days={days} accommodations={accommodations} />
      ) : visibleSummary && visibleFields.has('schedule') ? (
        <TripDays summary={visibleSummary} />
      ) : null}
    </>
  )
}

export function ReservationCardRoute({ reservation, Icon }: { reservation: Reservation; Icon: typeof Plane }) {
  if (reservation.type === 'flight') return null
  if (reservation.type === 'transit') return <TransitLegChips reservation={reservation} />
  return <RouteField route={reservationRoute(reservation)} Icon={Icon} />
}
