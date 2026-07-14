import { AlertCircle, Pencil, Trash2 } from 'lucide-react'
import type { Reservation } from '../types'
import { getType, reservationStatus, reservationTitle } from '../model'

interface ReservationCardHeaderProps {
  reservation: Reservation
  onEdit: (reservation: Reservation) => void
  onDelete: (reservation: Reservation) => void
}

export function ReservationCardHeader({ reservation, onEdit, onDelete }: ReservationCardHeaderProps) {
  const typeInfo = getType(reservation.type)
  const TypeIcon = typeInfo.Icon
  const confirmed = reservationStatus(reservation) === 'confirmed'
  const isAutomatedTransit = reservation.type === 'transit'

  return (
    <header
      className={`flex flex-nowrap items-center justify-between gap-2 px-3.5 py-3 ${isAutomatedTransit ? 'bg-[rgba(124,58,237,0.06)]' : confirmed ? 'bg-[color-mix(in_oklch,var(--success)_6%,transparent)]' : 'bg-[color-mix(in_oklch,var(--warning)_6%,transparent)]'}`}
    >
      <div className="flex min-w-0 flex-[0_1_auto] flex-nowrap items-center gap-2 overflow-hidden">
        <span
          className={`${confirmed ? 'trek-chip trek-chip--success' : 'trek-chip trek-chip--warning'} min-h-[22px] shrink-0 gap-[5px] rounded-md bg-transparent py-[3px] pr-2 pl-0`}
        >
          <span className="size-[7px] shrink-0 rounded-full bg-current" />
          {confirmed ? 'Confirmed' : 'Pending'}
        </span>
        <span
          className={`trek-chip min-h-[22px] min-w-0 flex-[0_1_auto] gap-[5px] overflow-hidden text-ellipsis rounded-md px-2 py-[3px] text-content-muted ${isAutomatedTransit ? 'bg-[rgba(124,58,237,0.1)]' : 'bg-surface-secondary'}`}
        >
          <TypeIcon className="shrink-0 text-[var(--reservation-color)]" size={12} />
          {typeInfo.label}
        </span>
        {reservation.needs_review ? (
          <span className="trek-chip trek-chip--warning min-h-[22px] min-w-0 gap-[5px] overflow-hidden text-ellipsis rounded-md px-2 py-[3px]">
            <AlertCircle size={11} />
            Needs review
          </span>
        ) : null}
        {reservation.external_source ? (
          <span className="trek-chip min-h-[22px] min-w-0 gap-[5px] overflow-hidden text-ellipsis rounded-md bg-surface-secondary px-2 py-[3px] text-content-muted">
            {reservation.external_source}
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-auto items-center gap-0.5">
        <div className="min-w-0 flex-auto text-right max-[720px]:text-left">
          <h3 className="m-0 truncate text-[13px] font-semibold leading-tight text-content">
            {reservationTitle(reservation)}
          </h3>
        </div>
        <div className="inline-flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            className="grid size-[26px] shrink-0 cursor-pointer place-items-center rounded-md border-0 bg-transparent text-content-faint hover:bg-surface-hover hover:text-content"
            onClick={() => onEdit(reservation)}
            title="Edit reservation"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            className="grid size-[26px] shrink-0 cursor-pointer place-items-center rounded-md border-0 bg-transparent text-content-faint hover:bg-[var(--danger-soft)] hover:text-danger"
            onClick={() => onDelete(reservation)}
            title="Delete reservation"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </header>
  )
}
