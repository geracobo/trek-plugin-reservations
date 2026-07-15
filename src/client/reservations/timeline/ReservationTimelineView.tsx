import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { ChevronsLeft, ChevronsRight, ZoomIn, ZoomOut } from 'lucide-react'
import type { Accommodation, Day, Reservation, Trip } from '../types'
import { groupReservations } from '../browse/browse-logic'
import type { ReservationGroupBy } from '../browse/browse-logic'
import type { CardFieldKey } from '../cards/ReservationCardSections'
import {
  getReservationPresentation,
  reservationPresentationContentText,
  type ReservationPresentationContext,
} from '../presentation'

const DEFAULT_DAY_WIDTH = 240
const MIN_DAY_WIDTH = 96
const MAX_DAY_WIDTH = 384
const DAY_WIDTH_STEP = 48
const OVERFLOW_GUTTER_WIDTH = 28
const DAY_MS = 86_400_000

type DateRange = { start: string; end: string }

function dateOnly(value: string | null | undefined) {
  const date = value?.split(/[T ]/)[0] || ''
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : ''
}

function addDays(value: string, offset: number) {
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}

function daysBetween(start: string, end: string) {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / DAY_MS)
}

function timelineRange(reservation: Reservation, context: ReservationPresentationContext): DateRange | null {
  const presentation = getReservationPresentation(reservation)
  const start = dateOnly(presentation.getStart(reservation, context))
  const end = dateOnly(presentation.getEnd(reservation, context)) || start
  if (!dateOnly(start)) return null
  return { start, end: dateOnly(end) && end >= start ? end : start }
}

function dayLabel(value: string) {
  const date = new Date(`${value}T00:00:00Z`)
  return {
    weekday: date.toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' }),
    day: date.toLocaleDateString(undefined, { day: 'numeric', timeZone: 'UTC' }),
    month: date.toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' }),
  }
}

function dayCellClass(date: string, header = false) {
  const isMonday = new Date(`${date}T00:00:00Z`).getUTCDay() === 1
  return `reservation-timeline-day ${header ? 'reservation-timeline-header-day' : ''} ${isMonday ? 'reservation-timeline-week-start' : ''}`
}

function timelineDetails(
  reservation: Reservation,
  selectedFields: Set<CardFieldKey>,
  context: ReservationPresentationContext,
) {
  const presentation = getReservationPresentation(reservation)
  const details: string[] = []
  if (selectedFields.has('details')) {
    if (reservation.confirmation_number) details.push(reservation.confirmation_number)
    details.push(...presentation.getDetailFields(reservation, context).map((field) => field.value))
  }
  if (selectedFields.has('location')) {
    const route = presentation.getRoute(reservation, context)
    if (route.length > 1) details.push(route.join(' → '))
    const location = presentation.getLocation(reservation, context)
    if (location) details.push(location)
  }
  if (selectedFields.has('notes') && reservation.notes) details.push(reservation.notes)
  if (selectedFields.has('files') && reservation.files?.length)
    details.push(`${reservation.files.length} file${reservation.files.length === 1 ? '' : 's'}`)
  return details
}

function TimelineScrollbar({
  scrollerRef,
  contentRef,
}: {
  scrollerRef: React.RefObject<HTMLElement>
  contentRef: React.RefObject<HTMLDivElement>
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ pointerId: number; startX: number; startLeft: number } | null>(null)
  const [thumb, setThumb] = useState({ left: 0, width: 0, visible: false })
  const update = useCallback(() => {
    const scroller = scrollerRef.current
    const track = trackRef.current
    const content = contentRef.current
    if (!scroller || !track || !content) return
    const overflow = content.scrollWidth - scroller.clientWidth
    const width = track.clientWidth
    if (overflow <= 0 || width <= 0) return setThumb({ left: 0, width: 0, visible: false })
    const thumbWidth = Math.max(64, (scroller.clientWidth / content.scrollWidth) * width)
    setThumb({
      visible: true,
      width: thumbWidth,
      left: (scroller.scrollLeft / overflow) * (width - thumbWidth),
    })
  }, [contentRef, scrollerRef])

  useEffect(() => {
    const scroller = scrollerRef.current
    const content = contentRef.current
    if (!scroller || !content) return
    update()
    const observer = new ResizeObserver(update)
    observer.observe(scroller)
    observer.observe(content)
    scroller.addEventListener('scroll', update, { passive: true })
    return () => {
      observer.disconnect()
      scroller.removeEventListener('scroll', update)
    }
  }, [contentRef, scrollerRef, update])

  const scrollToLeft = (left: number) => {
    const scroller = scrollerRef.current
    const track = trackRef.current
    const content = contentRef.current
    if (!scroller || !track || !content) return
    const maxScroll = content.scrollWidth - scroller.clientWidth
    const maxLeft = track.clientWidth - thumb.width
    scroller.scrollLeft = maxLeft > 0 ? Math.max(0, Math.min(1, left / maxLeft)) * maxScroll : 0
  }

  return (
    <div
      ref={trackRef}
      className="reservation-timeline-scrollbar"
      onPointerDown={(event) => {
        if (event.target !== event.currentTarget) return
        const rect = event.currentTarget.getBoundingClientRect()
        scrollToLeft(event.clientX - rect.left - thumb.width / 2)
      }}
      aria-hidden="true"
    >
      {thumb.visible ? (
        <div
          className="reservation-timeline-scrollbar-thumb"
          style={{ left: thumb.left, width: thumb.width }}
          onPointerDown={(event) => {
            event.preventDefault()
            event.stopPropagation()
            event.currentTarget.setPointerCapture(event.pointerId)
            dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startLeft: thumb.left }
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current
            if (!drag || drag.pointerId !== event.pointerId) return
            scrollToLeft(drag.startLeft + event.clientX - drag.startX)
          }}
          onPointerUp={() => {
            dragRef.current = null
          }}
          onPointerCancel={() => {
            dragRef.current = null
          }}
        />
      ) : null}
    </div>
  )
}

export function ReservationTimelineView({
  reservations,
  trip,
  days,
  accommodations,
  groupBy,
  selectedFields,
  onEdit,
}: {
  reservations: Reservation[]
  trip: Trip | null
  days: Day[]
  accommodations: Accommodation[]
  groupBy: ReservationGroupBy
  selectedFields: Set<CardFieldKey>
  onEdit: (reservation: Reservation) => void
}) {
  const [dayWidth, setDayWidth] = useState(DEFAULT_DAY_WIDTH)
  const scrollerRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const presentationContext = useMemo(() => ({ days, accommodations, trip }), [days, accommodations, trip])
  const ranges = useMemo(
    () => new Map(reservations.map((reservation) => [reservation.id, timelineRange(reservation, presentationContext)])),
    [reservations, presentationContext],
  )
  const datedReservations = reservations.filter((reservation) => ranges.get(reservation.id))
  const bounds = useMemo(() => {
    const starts = datedReservations.map((reservation) => ranges.get(reservation.id)!.start)
    const ends = datedReservations.map((reservation) => ranges.get(reservation.id)!.end)
    const tripStart = dateOnly(trip?.start_date)
    const tripEnd = dateOnly(trip?.end_date)
    if (tripStart && tripEnd)
      return { start: tripStart <= tripEnd ? tripStart : tripEnd, end: tripEnd >= tripStart ? tripEnd : tripStart }
    const start = [tripStart, ...starts].filter(Boolean).sort()[0]
    const end = [tripEnd, ...ends].filter(Boolean).sort().at(-1)
    if (!start || !end) return null
    return { start: start <= end ? start : end, end: end >= start ? end : start }
  }, [datedReservations, ranges, trip])

  const dates = useMemo(() => {
    if (!bounds) return []
    const length = daysBetween(bounds.start, bounds.end) + 1
    return Array.from({ length: Math.max(length, 0) }, (_, index) => addDays(bounds.start, index))
  }, [bounds])
  const visibleReservations = bounds
    ? datedReservations.filter((reservation) => {
        const range = ranges.get(reservation.id)!
        return range.end >= bounds.start && range.start <= bounds.end
      })
    : []
  const groups = groupReservations(visibleReservations, groupBy, presentationContext)
  const gridStyle = {
    gridTemplateColumns: `${OVERFLOW_GUTTER_WIDTH}px repeat(${dates.length}, ${dayWidth}px) minmax(${OVERFLOW_GUTTER_WIDTH}px, 1fr)`,
  }

  if (!bounds || dates.length === 0) {
    return (
      <div className="trek-card px-5 py-14 text-center text-sm text-content-muted">
        No dated reservations to show on a timeline.
      </div>
    )
  }

  return (
    <section
      ref={scrollerRef}
      className="trek-card reservation-timeline overflow-auto rounded-xl p-0"
      aria-label="Reservation timeline"
    >
      <div
        ref={contentRef}
        className="w-full"
        style={{ minWidth: dates.length * dayWidth + OVERFLOW_GUTTER_WIDTH * 2 }}
      >
        <div className="sticky top-0 z-10 border-b border-edge-faint bg-surface-secondary">
          <div
            className="sticky left-0 z-20 flex h-8 w-max items-center gap-1 bg-surface-secondary px-2"
            aria-label="Timeline zoom"
          >
            <button
              type="button"
              className="rounded p-1 text-content-muted hover:bg-surface-hover hover:text-content disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => setDayWidth((width) => Math.max(MIN_DAY_WIDTH, width - DAY_WIDTH_STEP))}
              disabled={dayWidth <= MIN_DAY_WIDTH}
              title="Zoom out"
              aria-label="Zoom out"
            >
              <ZoomOut size={14} />
            </button>
            <button
              type="button"
              className="rounded p-1 text-content-muted hover:bg-surface-hover hover:text-content disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => setDayWidth((width) => Math.min(MAX_DAY_WIDTH, width + DAY_WIDTH_STEP))}
              disabled={dayWidth >= MAX_DAY_WIDTH}
              title="Zoom in"
              aria-label="Zoom in"
            >
              <ZoomIn size={14} />
            </button>
          </div>
          <div className="grid border-t border-edge-faint" style={gridStyle}>
            <div className="reservation-timeline-gutter" style={{ gridColumn: 1, gridRow: 1 }} aria-hidden="true" />
            {dates.map((date) => {
              const label = dayLabel(date)
              return (
                <div className={`${dayCellClass(date, true)} px-1 py-1.5 text-center leading-tight`} key={date}>
                  <div className="text-[9px] font-extrabold uppercase text-content-faint">{label.weekday}</div>
                  <div className="text-xs font-bold text-content">{label.day}</div>
                  <div className="text-[9px] text-content-faint">{label.month}</div>
                </div>
              )
            })}
            <div
              className="reservation-timeline-gutter"
              style={{ gridColumn: dates.length + 2, gridRow: 1 }}
              aria-hidden="true"
            />
          </div>
        </div>
        {groups.map((group) => (
          <div key={group.key}>
            {groupBy !== 'none' ? (
              <div className="border-b border-edge-faint bg-surface-muted px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-content-muted">
                {group.title} <span className="ml-1 text-content-faint">{group.reservations.length}</span>
              </div>
            ) : null}
            {group.reservations.map((reservation) => {
              const range = ranges.get(reservation.id)!
              const presentation = getReservationPresentation(reservation)
              const Icon = presentation.Icon
              const startsBeforeTrip = range.start < bounds.start
              const endsAfterTrip = range.end > bounds.end
              const isPending = reservation.status !== 'confirmed'
              const start = Math.max(daysBetween(bounds.start, range.start), 0)
              const end = Math.min(daysBetween(bounds.start, range.end), dates.length - 1)
              const details = timelineDetails(reservation, selectedFields, presentationContext)
              const title = presentation.getTitle(reservation, presentationContext)
              const schedule = reservationPresentationContentText(
                presentation.getScheduleContent(reservation, presentationContext),
              )
              return (
                <div
                  className="reservation-timeline-row grid min-h-[62px] border-b"
                  key={reservation.id}
                  style={gridStyle}
                >
                  <div
                    className="reservation-timeline-gutter"
                    style={{ gridColumn: 1, gridRow: 1 }}
                    aria-hidden="true"
                  />
                  {dates.map((date, index) => (
                    <div className={dayCellClass(date)} style={{ gridColumn: index + 2, gridRow: 1 }} key={date} />
                  ))}
                  <div
                    className="reservation-timeline-gutter"
                    style={{ gridColumn: dates.length + 2, gridRow: 1 }}
                    aria-hidden="true"
                  />
                  <button
                    type="button"
                    className={`z-[2] my-2.5 flex min-w-0 items-center gap-1.5 overflow-hidden px-2 text-left text-white shadow-sm hover:brightness-95 ${isPending ? 'border border-white/30' : ''} ${startsBeforeTrip ? 'ml-0 rounded-l-none' : 'ml-1.5 rounded-l-md'} ${endsAfterTrip ? 'mr-0 rounded-r-none' : 'mr-1.5 rounded-r-md'}`}
                    style={
                      {
                        gridColumn: `${startsBeforeTrip ? 1 : start + 2} / ${endsAfterTrip ? dates.length + 3 : end + 3}`,
                        gridRow: 1,
                        backgroundColor: isPending
                          ? `color-mix(in srgb, ${presentation.color} 88%, white)`
                          : presentation.color,
                      } as CSSProperties
                    }
                    title={`${title}${startsBeforeTrip ? ' · Starts before trip' : ''}${endsAfterTrip ? ' · Ends after trip' : ''}`}
                    onClick={() => onEdit(reservation)}
                  >
                    {startsBeforeTrip ? (
                      <ChevronsLeft className="shrink-0" size={14} aria-label="Starts before trip" />
                    ) : null}
                    <Icon className="shrink-0" size={13} />
                    <span className="min-w-0 truncate text-[11px] font-semibold">{title}</span>
                    {selectedFields.has('schedule') ? (
                      <span className="min-w-0 truncate text-[10px] opacity-80">· {schedule || range.start}</span>
                    ) : null}
                    {details.length ? (
                      <span className="min-w-0 truncate text-[10px] opacity-80">· {details.join(' · ')}</span>
                    ) : null}
                    {endsAfterTrip ? (
                      <ChevronsRight className="ml-auto shrink-0" size={14} aria-label="Ends after trip" />
                    ) : null}
                  </button>
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <TimelineScrollbar scrollerRef={scrollerRef} contentRef={contentRef} />
    </section>
  )
}
