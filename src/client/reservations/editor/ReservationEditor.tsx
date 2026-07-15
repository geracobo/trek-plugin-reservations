import { useEffect, useState } from 'react'
import type { Accommodation, Cost, Day, Place, Reservation, ReservationFile } from '../types'
import { getType } from '../model'
import { getReservationPresentation, type ReservationCategory } from '../presentation'
import Modal from '../../trek-ui/Modal'
import { reservationFormKind, type ReservationDraft, type ReservationFormProps } from './editor-types'
import { MultiEndpointTransportForm } from './forms/MultiEndpointTransportForm'
import { PointToPointTransportForm } from './forms/PointToPointTransportForm'
import { AutomatedTransitForm } from './forms/AutomatedTransitForm'
import { AccommodationForm } from './forms/AccommodationForm'
import { SingleDateBookingForm } from './forms/SingleDateBookingForm'
import { MultiDateBookingForm } from './forms/MultiDateBookingForm'
import { ReservationTypeSelector } from './ReservationTypeSelector'
import { ReservationCostsSection } from './ReservationCostsSection'
import { ReservationFilesSection } from './ReservationFilesSection'

interface ReservationEditorProps extends Omit<
  ReservationFormProps,
  'type' | 'onDraftChange' | 'onSubmitDraft' | 'onAutomatedTransitPlanningChange'
> {
  open: boolean
  startingType?: string
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
  const [changingSavedType, setChangingSavedType] = useState(false)
  useEffect(() => {
    if (open) {
      setType(reservation?.type || startingType || null)
      setDraft(null)
      setPendingFiles([])
      setAutomatedTransitPlanning(false)
      setChangingSavedType(false)
    }
  }, [open, reservation, startingType])
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
  const changeNewReservationType = () => {
    setType(null)
    setDraft(null)
    setAutomatedTransitPlanning(false)
  }
  const typeCategory = type ? getReservationPresentation(type).category : undefined
  const canChangeSavedType = Boolean(
    reservation &&
    type !== 'transit' &&
    typeCategory &&
    getReservationPresentation(reservation).getProvenance(reservation).kind !== 'synced',
  )
  const selectSavedReservationType = async (nextType: string) => {
    if (!type || nextType === type) {
      setChangingSavedType(false)
      return
    }
    if (reservationFormKind(nextType) !== reservationFormKind(type)) {
      const confirmed = await window.trek.confirm({
        title: 'Change reservation type?',
        message: 'Some type-specific details may be cleared. Common reservation details will be kept.',
        confirmLabel: 'Change type',
        cancelLabel: 'Cancel',
      })
      if (!confirmed) return
    }
    setType(nextType)
    setDraft(null)
    setAutomatedTransitPlanning(false)
    setChangingSavedType(false)
  }
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
      viewportHeight="95dvh"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="trek-btn trek-btn--secondary px-4 py-2 text-xs">
            Cancel
          </button>
          {type && !changingSavedType && !(type === 'transit' && (!reservation || automatedTransitPlanning)) ? (
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
          {type && !changingSavedType ? (
            <ReservationIdentity
              type={type}
              reservation={reservation}
              onChangeType={
                reservation
                  ? canChangeSavedType
                    ? () => setChangingSavedType(true)
                    : undefined
                  : changeNewReservationType
              }
            />
          ) : (
            <ReservationTypeSelector
              category={changingSavedType ? typeCategory : undefined}
              onChange={changingSavedType ? selectSavedReservationType : setType}
              onCancel={changingSavedType ? () => setChangingSavedType(false) : undefined}
            />
          )}
        </div>
        {type ? (
          <div className={changingSavedType ? 'hidden' : undefined}>
            <Form key={type} {...props} />
          </div>
        ) : null}
        {type && !changingSavedType && type !== 'transit' && (
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

function ReservationIdentity({
  type,
  reservation,
  onChangeType,
}: {
  type: string
  reservation: Reservation | null
  onChangeType?: () => void
}) {
  const presentation = getReservationPresentation(reservation || type)
  const isTransit = type === 'transit'

  return (
    <div
      className={`flex min-h-11 items-center gap-2.5 rounded-xl border px-3 text-sm font-semibold ${
        isTransit
          ? 'border-[rgba(124,58,237,0.25)] bg-[rgba(124,58,237,0.08)] text-content'
          : 'border-edge bg-surface-card text-content'
      }`}
    >
      <presentation.Icon
        className={isTransit ? 'shrink-0 text-[#7c3aed]' : 'shrink-0'}
        style={isTransit ? undefined : { color: presentation.color }}
        size={16}
        aria-hidden="true"
      />
      <span>{presentation.label}</span>
      {onChangeType ? (
        <button
          type="button"
          onClick={onChangeType}
          className="trek-btn trek-btn--ghost ml-auto shrink-0 px-2 py-1 text-xs font-semibold"
        >
          Change
        </button>
      ) : null}
    </div>
  )
}
