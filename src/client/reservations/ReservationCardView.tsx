import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { Accommodation, Day, Reservation, Trip } from './types'
import { reservationStatus } from './model'
import { ReservationCard } from './ReservationCard'

interface ReservationGroup {
  key: string
  title: string
  reservations: Reservation[]
}

function groupReservations(reservations: Reservation[]): ReservationGroup[] {
  return [
    { key: 'pending', title: 'Pending', reservations: reservations.filter((reservation) => reservationStatus(reservation) !== 'confirmed') },
    { key: 'confirmed', title: 'Confirmed', reservations: reservations.filter((reservation) => reservationStatus(reservation) === 'confirmed') },
  ].filter((group) => group.reservations.length > 0)
}

interface ReservationCardViewProps {
  reservations: Reservation[]
  trip: Trip | null
  days: Day[]
  accommodations: Accommodation[]
}

export function ReservationCardView({ reservations, trip, days, accommodations }: ReservationCardViewProps) {
  const groups = groupReservations(reservations)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set())

  const toggleGroup = (key: string) => {
    setCollapsedGroups((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return groups.map((group) => {
    const collapsed = collapsedGroups.has(group.key)
    return (
      <section className="mb-7" key={group.key}>
        <button type="button" className="mb-3 flex w-full items-center gap-2 border-0 bg-transparent p-0 text-left" aria-expanded={!collapsed} onClick={() => toggleGroup(group.key)}>
          <ChevronDown className={`text-content-faint transition-transform ${collapsed ? '-rotate-90' : ''}`} size={15} />
          <h2 className="m-0 text-xs font-extrabold uppercase tracking-normal text-content-muted">{group.title}</h2>
          <span className="min-w-[19px] rounded-full bg-surface-muted px-1.5 py-px text-center text-[10px] font-extrabold text-content-faint">{group.reservations.length}</span>
        </button>
        {!collapsed ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(max(33.33%_-_14px,340px),1fr))] items-stretch gap-3.5">
            {group.reservations.map((reservation) => (
              <ReservationCard key={reservation.id} reservation={reservation} trip={trip} days={days} accommodations={accommodations} />
            ))}
          </div>
        ) : null}
      </section>
    )
  })
}
