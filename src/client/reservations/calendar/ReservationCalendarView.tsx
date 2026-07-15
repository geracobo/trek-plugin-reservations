import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Accommodation, Day, Reservation, Trip } from '../types'
import { getType, reservationTitle } from '../model'
import { getReservationPresentation, type ReservationPresentationContext } from '../presentation'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function firstReservationMonth(reservations: Reservation[], context: ReservationPresentationContext) {
  const first = reservations
    .map((reservation) => getReservationPresentation(reservation).getStart(reservation, context)?.slice(0, 10) || '')
    .filter(Boolean)
    .sort()[0]
  if (first) {
    const [year, month] = first.split('-').map(Number)
    if (year && month) return new Date(Date.UTC(year, month - 1, 1))
  }
  const today = new Date()
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
}

function tripStartMonth(trip: Trip | null) {
  const value = trip?.start_date?.split(/[T ]/)[0]
  if (!value) return null
  const [year, month] = value.split('-').map(Number)
  return year && month ? new Date(Date.UTC(year, month - 1, 1)) : null
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function reservationDateKeys(reservation: Reservation, context: ReservationPresentationContext) {
  const presentation = getReservationPresentation(reservation)
  const start = presentation.getStart(reservation, context)?.slice(0, 10)
  const end = presentation.getEnd(reservation, context)?.slice(0, 10) || start
  if (!start) return []
  const startDate = new Date(`${start}T00:00:00Z`)
  const endDate = new Date(`${end}T00:00:00Z`)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) return [start]
  const keys: string[] = []
  const current = new Date(startDate)
  while (current <= endDate && keys.length < 366) {
    keys.push(dateKey(current))
    current.setUTCDate(current.getUTCDate() + 1)
  }
  return keys
}

export function ReservationCalendarView({
  reservations,
  trip,
  days,
  accommodations,
  onEdit,
}: {
  reservations: Reservation[]
  trip: Trip | null
  days: Day[]
  accommodations: Accommodation[]
  onEdit: (reservation: Reservation) => void
}) {
  const context = useMemo(() => ({ days, accommodations }), [days, accommodations])
  const initialMonth = useMemo(() => firstReservationMonth(reservations, context), [reservations, context])
  const startMonth = useMemo(() => tripStartMonth(trip), [trip])
  const [month, setMonth] = useState(initialMonth)

  useEffect(() => setMonth(initialMonth), [initialMonth])

  const reservationsByDate = useMemo(
    () =>
      reservations.reduce<Record<string, Reservation[]>>((byDate, reservation) => {
        reservationDateKeys(reservation, context).forEach((key) => {
          ;(byDate[key] ??= []).push(reservation)
        })
        return byDate
      }, {}),
    [reservations, context],
  )

  const calendarDays = useMemo(() => {
    const first = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1))
    const mondayOffset = (first.getUTCDay() + 6) % 7
    const start = new Date(first)
    start.setUTCDate(first.getUTCDate() - mondayOffset)
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start)
      date.setUTCDate(start.getUTCDate() + index)
      return date
    })
  }, [month])

  const changeMonth = (offset: number) => {
    setMonth((current) => new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + offset, 1)))
  }

  return (
    <section className="trek-card overflow-hidden p-0 max-[720px]:overflow-x-auto">
      <header className="flex items-center justify-center gap-2.5 border-b border-edge-faint px-3 py-2.5 max-[720px]:sticky max-[720px]:left-0 max-[720px]:min-w-[700px]">
        <button
          type="button"
          className="trek-btn trek-btn--ghost reservation-calendar-nav min-h-[30px] px-2 py-1 text-xs"
          onClick={() => changeMonth(-1)}
          aria-label="Previous month"
        >
          <ChevronLeft className="shrink-0" size={16} />
          <span>Previous</span>
        </button>
        <h2 className="m-0 min-w-[180px] text-center text-sm font-semibold text-content">
          {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' })}
        </h2>
        {startMonth ? (
          <button
            type="button"
            className="trek-btn trek-btn--ghost reservation-calendar-nav min-h-[30px] px-2 py-1 text-xs"
            onClick={() => setMonth(startMonth)}
            title="Go to trip start month"
          >
            <CalendarDays size={14} />
            <span>Trip start</span>
          </button>
        ) : null}
        <button
          type="button"
          className="trek-btn trek-btn--ghost reservation-calendar-nav min-h-[30px] px-2 py-1 text-xs"
          onClick={() => changeMonth(1)}
          aria-label="Next month"
        >
          <span>Next</span>
          <ChevronRight className="shrink-0" size={16} />
        </button>
      </header>

      <div className="grid grid-cols-7 max-[720px]:min-w-[700px]">
        {WEEKDAYS.map((weekday) => (
          <div
            className="border-b border-edge-faint bg-surface-secondary p-2 text-center text-[10px] font-extrabold uppercase text-content-faint"
            key={weekday}
          >
            {weekday}
          </div>
        ))}
        {calendarDays.map((date) => {
          const key = dateKey(date)
          const entries = reservationsByDate[key] ?? []
          const outsideMonth = date.getUTCMonth() !== month.getUTCMonth()
          return (
            <div
              className={`min-h-28 min-w-0 border-r border-b border-edge-faint bg-surface p-[7px] [&:nth-child(7n)]:border-r-0 ${outsideMonth ? 'bg-surface-secondary opacity-55' : ''}`}
              key={key}
            >
              <span className="mb-1.5 block text-[11px] font-bold text-content-muted">{date.getUTCDate()}</span>
              <div className="flex flex-col gap-1">
                {entries.map((reservation) => {
                  const type = getType(reservation.type)
                  const Icon = type.Icon
                  return (
                    <button
                      type="button"
                      className="flex min-w-0 items-center gap-1 rounded-[5px] border-0 border-l-2 border-l-[var(--reservation-color)] bg-surface-muted px-[5px] py-1 text-left text-[10px] text-content-secondary"
                      key={reservation.id}
                      style={{ '--reservation-color': type.color } as React.CSSProperties}
                      title={reservationTitle(reservation)}
                      onClick={() => onEdit(reservation)}
                    >
                      <Icon className="shrink-0 text-[var(--reservation-color)]" size={11} />
                      <span className="truncate">{reservationTitle(reservation)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
