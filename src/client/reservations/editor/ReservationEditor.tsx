import { useEffect, useState } from 'react'
import type { Accommodation, Day, Place, Reservation, ReservationFile } from '../types'
import { getType } from '../model'
import Modal from '../../trek-ui/Modal'
import { reservationFormKind, type ReservationFormProps } from './types'
import { MultiLegTransportForm } from './forms/MultiLegTransportForm'
import { PointToPointTransportForm } from './forms/PointToPointTransportForm'
import { AutomatedTransitForm } from './forms/AutomatedTransitForm'
import { AccommodationForm } from './forms/AccommodationForm'
import { SingleDateBookingForm } from './forms/SingleDateBookingForm'
import { MultiDateBookingForm } from './forms/MultiDateBookingForm'
import { ReservationTypeSelector } from './ReservationTypeSelector'
import type { ReservationTypeCategory } from './ReservationTypeSelector'

interface ReservationEditorProps extends ReservationFormProps {
  open: boolean
  startingType?: string
  startingCategory?: ReservationTypeCategory
  onClose: () => void
}

export function ReservationEditor({
  open,
  reservation,
  days,
  places,
  accommodations,
  files,
  startingType,
  startingCategory,
  onClose,
}: ReservationEditorProps) {
  const [type, setType] = useState<string | null>(null)
  useEffect(() => {
    if (open) setType(reservation?.type || startingType || null)
  }, [open, reservation, startingType, startingCategory])
  const props = {
    reservation: reservation ? { ...reservation, type: type || reservation.type } : null,
    days,
    places,
    accommodations,
    files,
  }
  const kind = reservationFormKind(type)
  const Form =
    kind === 'multi-leg-transport'
      ? MultiLegTransportForm
      : kind === 'point-to-point-transport'
        ? PointToPointTransportForm
        : kind === 'automated-transit'
          ? AutomatedTransitForm
          : kind === 'accommodation'
            ? AccommodationForm
            : kind === 'single-date-booking'
              ? SingleDateBookingForm
              : MultiDateBookingForm
  const title = reservation ? `Edit ${getType(type).label}` : 'New Reservation'
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={title}
      size="2xl"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="trek-btn trek-btn--secondary px-4 py-2 text-xs">
            Cancel
          </button>
          <button
            type="button"
            disabled
            className="trek-btn trek-btn--primary cursor-not-allowed px-5 py-2 text-xs opacity-50"
          >
            {reservation ? 'Update' : 'Add'}
          </button>
        </div>
      }
    >
      <div className="mb-5">
        <span className="mb-[5px] block text-[11px] font-semibold uppercase tracking-[0.03em] text-content-faint">
          Reservation type
        </span>
        <ReservationTypeSelector
          key={`${open}-${reservation?.id ?? 'new'}`}
          value={type || undefined}
          startingValue={reservation?.type || startingType}
          startingCategory={reservation ? undefined : startingCategory}
          showBackButton={!reservation && !startingCategory}
          onChange={setType}
        />
      </div>
      {type ? (
        <Form key={kind} {...props} />
      ) : (
        <p className="m-0 text-sm text-content-muted">Choose a reservation type to continue.</p>
      )}
    </Modal>
  )
}
