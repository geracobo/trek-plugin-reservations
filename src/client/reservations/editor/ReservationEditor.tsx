import { useEffect, useState } from 'react'
import type { Accommodation, Cost, Day, Place, Reservation, ReservationFile } from '../types'
import { getType } from '../model'
import Modal from '../../trek-ui/Modal'
import { reservationFormKind, type ReservationDraft, type ReservationFormProps } from './editor-types'
import { MultiEndpointTransportForm } from './forms/MultiEndpointTransportForm'
import { PointToPointTransportForm } from './forms/PointToPointTransportForm'
import { AutomatedTransitForm } from './forms/AutomatedTransitForm'
import { AccommodationForm } from './forms/AccommodationForm'
import { SingleDateBookingForm } from './forms/SingleDateBookingForm'
import { MultiDateBookingForm } from './forms/MultiDateBookingForm'
import { ReservationTypeSelector } from './ReservationTypeSelector'
import type { ReservationTypeCategory } from './ReservationTypeSelector'
import { ReservationCostsSection } from './ReservationCostsSection'
import { ReservationFilesSection } from './ReservationFilesSection'

interface ReservationEditorProps extends Omit<
  ReservationFormProps,
  'type' | 'onDraftChange' | 'onSubmitDraft' | 'onAutomatedTransitPlanningChange'
> {
  open: boolean
  startingType?: string
  startingCategory?: ReservationTypeCategory
  onClose: () => void
  onSaved: (reservation: Reservation) => void
  costs: Cost[]
  onCreateCost: (reservation: Reservation) => Promise<void>
  onOpenCost: (cost: Cost) => void
  onRemoveCost: (cost: Cost) => void
  onUploadFile: (reservation: Reservation, file: File) => Promise<void>
  onLinkFile: (reservation: Reservation, file: ReservationFile) => Promise<void>
  onRemoveFile: (reservation: Reservation, file: ReservationFile) => Promise<void>
}

export function ReservationEditor({
  open,
  tripId,
  reservation,
  days,
  places,
  accommodations,
  files,
  startingType,
  startingCategory,
  onClose,
  onSaved,
  costs,
  onCreateCost,
  onOpenCost,
  onRemoveCost,
  onUploadFile,
  onLinkFile,
  onRemoveFile,
}: ReservationEditorProps) {
  const [type, setType] = useState<string | null>(null)
  const [draft, setDraft] = useState<ReservationDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [automatedTransitPlanning, setAutomatedTransitPlanning] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  useEffect(() => {
    if (open) {
      setType(reservation?.type || startingType || null)
      setDraft(null)
      setPendingFiles([])
      setAutomatedTransitPlanning(false)
    }
  }, [open, reservation, startingType, startingCategory])
  const kind = reservationFormKind(type)
  const Form =
    kind === 'multi-endpoint-transport'
      ? MultiEndpointTransportForm
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
  const save = async (createCost: boolean = false) => {
    if (!tripId || !draft || saving) return
    setSaving(true)
    try {
      const result = await window.trek.invoke<{ reservation: Reservation }>('/reservations/save', {
        method: 'POST',
        body: { tripId, reservationId: reservation?.id, input: draft.input, accommodation: draft.accommodation },
      })
      onSaved(result.reservation)
      window.trek.notify('success', reservation ? 'Reservation updated' : 'Reservation added')
      for (const file of pendingFiles) await onUploadFile(result.reservation, file)
      if (createCost) await onCreateCost(result.reservation)
      onClose()
    } catch (error) {
      window.trek.notify('error', error instanceof Error ? error.message : 'Unable to save reservation')
    } finally {
      setSaving(false)
    }
  }
  const props = {
    tripId,
    type: type || reservation?.type || 'other',
    // Forms use the explicit `type` prop for their selected behavior. Keep the
    // reservation reference stable so a draft update does not re-hydrate and
    // reset the form on every keystroke.
    reservation,
    days,
    places,
    accommodations,
    files,
    onDraftChange: setDraft,
    onAutomatedTransitPlanningChange: setAutomatedTransitPlanning,
    onSubmitDraft: async (nextDraft: ReservationDraft) => {
      setDraft(nextDraft)
      if (!tripId || saving) return
      setSaving(true)
      try {
        const result = await window.trek.invoke<{ reservation: Reservation }>('/reservations/save', {
          method: 'POST',
          body: {
            tripId,
            reservationId: reservation?.id,
            input: nextDraft.input,
            accommodation: nextDraft.accommodation,
          },
        })
        onSaved(result.reservation)
        window.trek.notify('success', reservation ? 'Reservation updated' : 'Reservation added')
        onClose()
      } catch (error) {
        window.trek.notify('error', error instanceof Error ? error.message : 'Unable to save reservation')
      } finally {
        setSaving(false)
      }
    },
  }
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={title}
      size="2xl"
      contentClassName="sm:h-[calc(100dvh-90px)]"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="trek-btn trek-btn--secondary px-4 py-2 text-xs">
            Cancel
          </button>
          {!(type === 'transit' && (!reservation || automatedTransitPlanning)) ? (
            <button
              type="button"
              disabled={!draft || saving || !draft.title.trim()}
              onClick={() => save()}
              className="trek-btn trek-btn--primary px-5 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving…' : reservation ? 'Update' : 'Add'}
            </button>
          ) : null}
        </div>
      }
    >
      <div>
        <div className="mb-5">
          <span className="mb-[5px] block text-[11px] font-semibold uppercase tracking-[0.03em] text-content-faint">
            Reservation type
          </span>
          {reservation?.type === 'transit' ? (
            <div className="flex min-h-10 items-center gap-2 rounded-xl border border-[rgba(124,58,237,0.25)] bg-[rgba(124,58,237,0.08)] px-3 text-sm font-semibold text-content">
              <span className="size-2 rounded-full bg-[#7c3aed]" />
              Public transit
            </div>
          ) : (
            <ReservationTypeSelector
              key={`${open}-${reservation?.id ?? 'new'}`}
              value={type || undefined}
              startingValue={reservation?.type || startingType}
              startingCategory={reservation ? undefined : startingCategory}
              showBackButton={!reservation && !startingCategory}
              onChange={setType}
            />
          )}
        </div>
        {type ? (
          <Form key={kind} {...props} />
        ) : (
          <p className="m-0 text-sm text-content-muted">Choose a reservation type to continue.</p>
        )}
        {type && type !== 'transit' && (
          <div className="mt-5 border-t border-edge-faint pt-4">
            <ReservationFilesSection
              files={
                reservation
                  ? files.filter(
                      (file) =>
                        Number(file.reservation_id) === reservation.id ||
                        file.linked_reservation_ids?.some((id) => Number(id) === reservation.id),
                    )
                  : []
              }
              allFiles={files}
              reservationId={reservation?.id ?? null}
              isSaved={Boolean(reservation)}
              pendingFiles={pendingFiles}
              onAddPending={(file) => setPendingFiles((current) => [...current, file])}
              onRemovePending={(index) =>
                setPendingFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))
              }
              onUpload={(file) => (reservation ? onUploadFile(reservation, file) : Promise.resolve())}
              onLink={(file) => (reservation ? onLinkFile(reservation, file) : Promise.resolve())}
              onRemove={(file) => (reservation ? onRemoveFile(reservation, file) : Promise.resolve())}
            />
            <div className="mt-5 border-t border-edge-faint pt-4">
              <ReservationCostsSection
                costs={reservation ? costs.filter((cost) => Number(cost.reservation_id) === reservation.id) : []}
                currency={undefined}
                onCreate={() => (reservation ? onCreateCost(reservation) : save(true))}
                onOpen={onOpenCost}
                onRemove={onRemoveCost}
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
