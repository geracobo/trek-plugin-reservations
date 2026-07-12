import { useEffect } from 'react'
import { TramFront } from 'lucide-react'
import type { ReservationFormProps } from '../types'
import { reservationRoute, reservationTitle } from '../../model'

export function AutomatedTransitForm({ reservation, onDraftChange }: ReservationFormProps) {
  const route = reservation ? reservationRoute(reservation) : []
  useEffect(() => onDraftChange?.(null), [onDraftChange])
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-[rgba(124,58,237,0.25)] bg-[rgba(124,58,237,0.08)] p-4 text-content">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <TramFront size={17} className="text-[#7c3aed]" />
          Automated transit journey
        </div>
        <p className="mb-0 mt-2 text-xs leading-[1.5] text-content-muted">
          Automated transit is generated from route planning. Its journey legs are not edited as a manual reservation.
        </p>
      </div>
      {reservation ? (
        <div className="rounded-[10px] bg-surface-secondary p-3 text-sm text-content">
          <strong>{reservationTitle(reservation)}</strong>
          {route.length ? <p className="mb-0 mt-1 text-content-muted">{route.join(' → ')}</p> : null}
        </div>
      ) : (
        <p className="m-0 text-sm text-content-muted">
          Plan a route from TREK’s transit flow to create an automated transit journey.
        </p>
      )}
      <button type="button" disabled className="trek-btn trek-btn--secondary w-fit opacity-60">
        Open transit planner (coming soon)
      </button>
    </div>
  )
}
