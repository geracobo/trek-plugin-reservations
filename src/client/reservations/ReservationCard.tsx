import { AlertCircle, ArrowLeft, ArrowRight, ArrowRightFromLine, ArrowRightToLine, CalendarDays, ExternalLink, FileText, Hotel, MapPin, Pencil, Plane, StickyNote, Trash2 } from 'lucide-react'
import type { Accommodation, Day, Reservation, Trip } from './types'
import {
  getType,
  metadataFields,
  normalizeMetadata,
  reservationDateRange,
  reservationRoute,
  reservationStatus,
  reservationTimeRange,
  reservationTitle,
  TRANSPORT_TYPES,
} from './model'

interface ReservationCardProps {
  reservation: Reservation
  trip: Trip | null
  days: Day[]
  accommodations: Accommodation[]
}

function Field({ label, value, mono = false, centered = false, Icon }: { label: string; value: string | null | undefined; mono?: boolean; centered?: boolean; Icon?: typeof Hotel }) {
  if (!value) return null
  return (
    <div className="min-w-0">
      <div className={`mb-[5px] text-[10px] font-extrabold uppercase text-content-faint ${centered ? 'text-center' : ''}`}>{label}</div>
      <div className={`min-h-[34px] rounded-[10px] bg-surface-muted px-2.5 py-2 text-[12.5px] font-semibold text-content [overflow-wrap:anywhere] ${mono ? 'font-mono' : ''} ${centered ? 'text-center' : ''}`}>{Icon ? <span className="flex items-center gap-1.5"><Icon className="shrink-0 text-content-faint" size={14} /><span>{value}</span></span> : value}</div>
    </div>
  )
}

type BookingTripRelation = 'before' | 'ends-during' | 'spans-trip' | 'starts-during' | 'after' | null

function bookingTripRelation(reservation: Reservation, trip: Trip | null): BookingTripRelation {
  if (TRANSPORT_TYPES.has(reservation.type ?? '') || reservation.type === 'hotel') return null
  const start = reservation.reservation_time?.split(/[T ]/)[0]
  const end = reservation.reservation_end_time?.split(/[T ]/)[0] || start
  const tripStart = trip?.start_date?.split(/[T ]/)[0]
  const tripEnd = trip?.end_date?.split(/[T ]/)[0]
  if (!start || !end || !tripStart || !tripEnd) return null

  // Open-date bookings can sit fully outside, overlap one boundary, or span the
  // entire itinerary. Check the full-span case before either one-sided overlap.
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

function daySummary(reservation: Reservation, trip: Trip | null, days: Day[], accommodations: Accommodation[]) {
  const reservationDate = reservation.reservation_time?.split(/[T ]/)[0]
  const reservationEndDate = reservation.reservation_end_time?.split(/[T ]/)[0] || reservationDate
  const relation = bookingTripRelation(reservation, trip)
  const shortDate = (value: string) => new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', timeZone: 'UTC',
  })
  // Booking types can be assigned to the nearest trip day by the host even when
  // their actual date is outside the itinerary. Show their actual relationship.
  if (relation) {
    const relatedDate = relation === 'ends-during' ? reservationEndDate
      : relation === 'starts-during' ? reservationDate
        : null
    const relatedDay = relatedDate ? days.find((day) => day.date === relatedDate) : undefined
    const tripStart = trip?.start_date?.split(/[T ]/)[0]
    const relatedDayNumber = relatedDate && tripStart
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

  const accommodation = reservation.type === 'hotel' && reservation.accommodation_id
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
      endDay: linkedEndDay?.id !== startDay.id ? (linkedEndDay?.title || (linkedEndDay ? `Day ${linkedEndDay.day_number || ''}`.trim() : null)) : null,
      endDate: linkedEndDay?.id !== startDay.id && linkedEndDay?.date ? shortDate(linkedEndDay.date) : null,
      outsideTrip: null,
    }
  }

  const startValue = reservationDate
  if (!startValue) return null

  const startDate = new Date(`${startValue}T00:00:00Z`)
  if (Number.isNaN(startDate.getTime())) return null

  const formatDate = (date: Date) => date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
  const endValue = reservation.reservation_end_time?.split(/[T ]/)[0]
  const endDate = endValue ? new Date(`${endValue}T00:00:00Z`) : null
  const validEndDate = endDate && !Number.isNaN(endDate.getTime()) ? endDate : null
  if (!tripStart) return { day: 'Day', date: formatDate(startDate), endDay: null, endDate: validEndDate ? formatDate(validEndDate) : null, outsideTrip: null }

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

function TripDaysValue({ summary, fallbackDay }: { summary: ReturnType<typeof daySummary>; fallbackDay?: string }) {
  if (!summary) return <strong>{fallbackDay || '—'}</strong>

  if (!summary.outsideTrip) {
    return <><strong>{fallbackDay || summary.day || '—'}</strong><span>{summary.date}</span></>
  }

  const endsDuringTrip = summary.outsideTrip === 'ends-during'
  const startsDuringTrip = summary.outsideTrip === 'starts-during'
  const spansTrip = summary.outsideTrip === 'spans-trip'
  const label = summary.outsideTrip === 'before' ? 'Before trip'
    : summary.outsideTrip === 'after' ? 'After trip'
      : spansTrip ? 'Spans entire trip'
      : endsDuringTrip ? 'Ends during trip'
        : 'Starts during trip'

  return (
    <span className="inline-flex flex-wrap items-center justify-center gap-1.5 font-semibold">
      <CalendarDays size={14} />
      {spansTrip ? <><ArrowLeft size={14} /><ArrowRight size={14} /></> : endsDuringTrip ? <ArrowRightToLine size={14} /> : startsDuringTrip ? <ArrowRightFromLine size={14} /> : summary.outsideTrip === 'before' ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
      <span>{label}</span>
      {(endsDuringTrip || startsDuringTrip) && summary.day ? <><span className="text-content-muted">·</span><strong>{summary.day}</strong><span>{summary.date}</span></> : null}
    </span>
  )
}

function FlightDetails({ reservation, trip, days, accommodations }: { reservation: Reservation; trip: Trip | null; days: Day[]; accommodations: Accommodation[] }) {
  const summary = daySummary(reservation, trip, days, accommodations)
  const metadata = normalizeMetadata(reservation)
  const endpointRoute = reservationRoute(reservation)
  // TODO: Prefer joined endpoint rows when trips.getReservations() exposes them.
  // Until then, use only endpoint or metadata values actually returned by TREK.
  const route = endpointRoute.length >= 2
    ? endpointRoute
    : [metadata.departure_airport, metadata.arrival_airport].filter((value): value is string => typeof value === 'string' && value.length > 0)

  return (
    <>
      <div className="min-w-0">
        <div className="mb-[5px] text-center text-[10px] font-extrabold uppercase text-content-faint">Trip days</div>
        <div className="flex min-h-9 items-center justify-center gap-3 rounded-[10px] bg-surface-muted px-3 py-2 text-xs text-content">
          <TripDaysValue summary={summary} fallbackDay={typeof metadata.day_title === 'string' ? metadata.day_title : undefined} />
          {summary?.endDay && summary.endDate ? (
            <>
              <span className="text-content-muted">–</span>
              <strong>{summary.endDay}</strong>
              <span>{summary.endDate}</span>
            </>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 [&>div>div:last-child]:text-center">
        <Field label="Date" value={reservationDateRange(reservation)} centered />
        <Field label="Time" value={reservationTimeRange(reservation)} centered />
      </div>

      <div className="[&>div>div:last-child]:text-center">
        <Field label="Booking code" value={reservation.confirmation_number || '—'} mono />
      </div>

      {route.length > 0 ? <div className="flex flex-wrap items-center justify-center gap-2 rounded-[10px] bg-surface-muted px-3 py-2 text-[12.5px] text-content">
        {route.map((name, index) => (
          <span className="inline-flex min-w-0 items-center gap-2 font-semibold" key={`${name}-${index}`}>
            {index > 0 ? <Plane className="shrink-0 text-[var(--reservation-color)]" size={14} /> : null}
            <span className="truncate">{name}</span>
          </span>
        ))}
      </div> : null}
    </>
  )
}

export function ReservationCard({ reservation, trip, days, accommodations }: ReservationCardProps) {
  const typeInfo = getType(reservation.type)
  const TypeIcon = typeInfo.Icon
  const status = reservationStatus(reservation)
  const confirmed = status === 'confirmed'
  const route = reservationRoute(reservation)
  const url = reservation.url || reservation.booking_url
  const fields = metadataFields(reservation).slice(0, 8)
  const summary = daySummary(reservation, trip, days, accommodations)
  const isFlight = reservation.type === 'flight'
  const isAccommodation = reservation.type === 'hotel'
  // Transport rows can reference a day without exposing that joined day's
  // number/date through the plugin API. Keep the layout visible without
  // inventing trip data until trips.getReservations() includes the join.
  const visibleSummary = summary
    ? (isAccommodation && !summary.endDay ? { ...summary, endDay: 'Day', endDate: '—' } : summary)
    : (TRANSPORT_TYPES.has(reservation.type ?? '') || isAccommodation
        ? { day: 'Day', date: '—', ...(isAccommodation ? { endDay: 'Day', endDate: '—' } : {}) }
        : null)
  const attachedFiles = reservation.files ?? []
  const unavailableAction = () => {
    window.trek.notify('info', 'Editing reservations from this plugin is not wired yet.')
  }

  return (
    <article className={`trek-card flex min-w-0 flex-col overflow-hidden rounded-xl border p-0 transition-shadow duration-150 hover:shadow-md ${confirmed ? 'border-success/25' : 'border-warning/25'}`} style={{ '--reservation-color': typeInfo.color } as React.CSSProperties}>
      <header className={`flex flex-nowrap items-center justify-between gap-2 px-3.5 py-3 ${confirmed ? 'bg-[color-mix(in_oklch,var(--success)_6%,transparent)]' : 'bg-[color-mix(in_oklch,var(--warning)_6%,transparent)]'}`}>
        <div className="flex min-w-0 flex-[0_1_auto] flex-nowrap items-center gap-2 overflow-hidden">
          <span className={`${confirmed ? 'trek-chip trek-chip--success' : 'trek-chip trek-chip--warning'} min-h-[22px] shrink-0 gap-[5px] rounded-md bg-transparent py-[3px] pr-2 pl-0`}>
            <span className="size-[7px] shrink-0 rounded-full bg-current" />
            {confirmed ? 'Confirmed' : 'Pending'}
          </span>
          <span className="trek-chip min-h-[22px] min-w-0 flex-[0_1_auto] gap-[5px] overflow-hidden text-ellipsis rounded-md bg-surface-secondary px-2 py-[3px] text-content-muted">
            <TypeIcon className="shrink-0 text-[var(--reservation-color)]" size={12} />
            {typeInfo.label}
          </span>
          {reservation.needs_review ? (
            <span className="trek-chip trek-chip--warning min-h-[22px] min-w-0 gap-[5px] overflow-hidden text-ellipsis rounded-md px-2 py-[3px]">
              <AlertCircle size={11} />
              Needs review
            </span>
          ) : null}
          {reservation.external_source ? <span className="trek-chip min-h-[22px] min-w-0 gap-[5px] overflow-hidden text-ellipsis rounded-md bg-surface-secondary px-2 py-[3px] text-content-muted">{reservation.external_source}</span> : null}
        </div>
        <div className="flex min-w-0 flex-auto items-center gap-0.5">
          <div className="min-w-0 flex-auto text-right max-[720px]:text-left">
            <h3 className="m-0 truncate text-[13px] font-semibold leading-tight text-content">{reservationTitle(reservation)}</h3>
          </div>
          <div className="inline-flex shrink-0 items-center gap-0.5">
            <button type="button" className="grid size-[26px] shrink-0 cursor-pointer place-items-center rounded-md border-0 bg-transparent text-content-faint hover:bg-surface-hover hover:text-content" onClick={unavailableAction} title="Edit reservation">
              <Pencil size={13} />
            </button>
            <button type="button" className="grid size-[26px] shrink-0 cursor-pointer place-items-center rounded-md border-0 bg-transparent text-content-faint hover:bg-[var(--danger-soft)] hover:text-danger" onClick={unavailableAction} title="Delete reservation">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-3 p-3.5">
        {isFlight ? (
          <FlightDetails reservation={reservation} trip={trip} days={days} accommodations={accommodations} />
        ) : visibleSummary ? (
          <div className="min-w-0">
            <div className="mb-[5px] text-center text-[10px] font-extrabold uppercase text-content-faint">Trip days</div>
            <div className="flex min-h-9 items-center justify-center gap-3 rounded-[10px] bg-surface-muted px-3 py-2 text-xs text-content">
              <TripDaysValue summary={visibleSummary} />
              {visibleSummary.endDay && visibleSummary.endDate ? (
                <>
                  <span className="text-content-muted">–</span>
                  <strong>{visibleSummary.endDay}</strong>
                  <span>{visibleSummary.endDate}</span>
                </>
              ) : null}
            </div>
          </div>
        ) : null}

        {!isFlight ? <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2.5">
          <Field label="Date" value={reservationDateRange(reservation)} centered />
          <Field label="Time" value={reservationTimeRange(reservation)} centered />
          <Field label="Confirmation code" value={reservation.confirmation_number} mono />
          {fields.map((field) => (
            <Field key={`${field.label}-${field.value}`} label={field.label} value={field.value} Icon={field.label === 'Accommodation' ? Hotel : undefined} />
          ))}
        </div> : null}

        {!isFlight && route.length >= 2 ? (
          <div className="flex flex-wrap items-center justify-center gap-2 rounded-[10px] bg-surface-muted px-3 py-2 text-[12.5px] text-content">
            {route.map((name, index) => (
              <span className="inline-flex min-w-0 items-center gap-2 font-semibold" key={`${name}-${index}`}>
                {index > 0 ? <TypeIcon className="shrink-0 text-[var(--reservation-color)]" size={14} /> : null}
                <span className="truncate">{name}</span>
              </span>
            ))}
          </div>
        ) : null}

        {attachedFiles.length > 0 ? <div>
          <div className="mb-[5px] text-[10px] font-extrabold uppercase text-content-faint">Files</div>
          <div className="flex flex-col gap-[7px] rounded-[10px] bg-surface-muted px-3 py-2.5 text-content-muted">
            {attachedFiles.map((file, index) => (
              <div className="flex min-w-0 items-center gap-1.5 text-xs" key={file.id ?? `${file.original_name || file.filename}-${index}`}>
                <FileText className="shrink-0 text-content-faint" size={13} />
                <span className="truncate">{file.original_name || file.filename || 'Unnamed file'}</span>
              </div>
            ))}
          </div>
        </div> : null}

        {reservation.location && !fields.some((field) => field.label === 'Location') ? (
          <div className="flex min-w-0 items-start gap-[7px] text-[12.5px] leading-[1.45] text-content-muted">
            <MapPin className="mt-0.5 shrink-0 text-content-faint" size={14} />
            <span>{reservation.location}</span>
          </div>
        ) : null}

        {reservation.notes ? (
          <div className="flex min-w-0 items-start gap-[7px] text-[12.5px] leading-[1.45] text-content-muted">
            <StickyNote className="mt-0.5 shrink-0 text-content-faint" size={14} />
            <p className="m-0 whitespace-pre-wrap [overflow-wrap:anywhere]">{reservation.notes}</p>
          </div>
        ) : null}

        {url ? (
          <a className="flex min-w-0 items-center gap-[7px] text-[12.5px] font-bold leading-[1.45] text-accent no-underline" href={url} target="_blank" rel="noreferrer">
            <ExternalLink className="shrink-0" size={14} />
            Open reservation
          </a>
        ) : null}
      </div>
    </article>
  )
}
