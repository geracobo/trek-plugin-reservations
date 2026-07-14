import { ExternalLink, FileText, Hotel, MapPin, Plane, StickyNote } from 'lucide-react'
import type { Accommodation, Day, Reservation, Trip } from '../types'
import { getType, metadataFields, reservationDateRange, reservationTimeRange } from '../model'
import { ReservationCardField } from './ReservationCardField'
import { ReservationCardRoute, ReservationCardSchedule } from './ReservationCardSchedule'
import type { CardFieldKey } from './ReservationCardSections'

interface ReservationCardDetailsProps {
  reservation: Reservation
  trip: Trip | null
  days: Day[]
  accommodations: Accommodation[]
  visibleFields: Set<CardFieldKey>
}

export function ReservationCardDetails({
  reservation,
  trip,
  days,
  accommodations,
  visibleFields,
}: ReservationCardDetailsProps) {
  const isFlight = reservation.type === 'flight'
  const fields = metadataFields(reservation).slice(0, 8)
  const locationField = fields.find((field) => field.label === 'Location')
  const detailFields = fields.filter((field) => field.label !== 'Location')
  const attachedFiles = reservation.files ?? []
  const url = reservation.url || reservation.booking_url
  const TypeIcon = getType(reservation.type).Icon

  return (
    <div className="flex flex-1 flex-col gap-3 p-3.5">
      <ReservationCardSchedule
        reservation={reservation}
        trip={trip}
        days={days}
        accommodations={accommodations}
        visibleFields={visibleFields}
      />

      {!isFlight && (visibleFields.has('schedule') || visibleFields.has('details')) ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2.5">
          {visibleFields.has('schedule') ? (
            <>
              <ReservationCardField label="Date" value={reservationDateRange(reservation)} centered />
              <ReservationCardField label="Time" value={reservationTimeRange(reservation)} centered />
            </>
          ) : null}
          {visibleFields.has('details') ? (
            <>
              <ReservationCardField label="Confirmation code" value={reservation.confirmation_number} mono />
              {detailFields.map((field) => (
                <ReservationCardField
                  key={`${field.label}-${field.value}`}
                  label={field.label}
                  value={field.value}
                  Icon={field.label === 'Accommodation' ? Hotel : undefined}
                />
              ))}
            </>
          ) : null}
        </div>
      ) : null}

      {visibleFields.has('location') && locationField ? (
        <ReservationCardField label={locationField.label} value={locationField.value} Icon={MapPin} />
      ) : null}

      {visibleFields.has('location') ? (
        <ReservationCardRoute reservation={reservation} Icon={TypeIcon || Plane} />
      ) : null}

      {visibleFields.has('files') && attachedFiles.length > 0 ? <ReservationCardFiles files={attachedFiles} /> : null}

      {visibleFields.has('location') && reservation.location && !locationField ? (
        <div className="flex min-w-0 items-start gap-[7px] text-[12.5px] leading-[1.45] text-content-muted">
          <MapPin className="mt-0.5 shrink-0 text-content-faint" size={14} />
          <span>{reservation.location}</span>
        </div>
      ) : null}

      {visibleFields.has('notes') && reservation.notes ? (
        <div className="flex min-w-0 items-start gap-[7px] text-[12.5px] leading-[1.45] text-content-muted">
          <StickyNote className="mt-0.5 shrink-0 text-content-faint" size={14} />
          <p className="m-0 whitespace-pre-wrap [overflow-wrap:anywhere]">{reservation.notes}</p>
        </div>
      ) : null}

      {url ? (
        <a
          className="flex min-w-0 items-center gap-[7px] text-[12.5px] font-bold leading-[1.45] text-accent no-underline"
          href={url}
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink className="shrink-0" size={14} />
          Open reservation
        </a>
      ) : null}
    </div>
  )
}

function ReservationCardFiles({ files }: { files: NonNullable<Reservation['files']> }) {
  return (
    <div>
      <div className="mb-[5px] text-[10px] font-extrabold uppercase text-content-faint">Files</div>
      <div className="flex flex-col gap-[7px] rounded-[10px] bg-surface-muted px-3 py-2.5 text-content-muted">
        {files.map((file, index) => (
          <div
            className="flex min-w-0 items-center gap-1.5 text-xs"
            key={file.id ?? `${file.original_name || file.filename}-${index}`}
          >
            <FileText className="shrink-0 text-content-faint" size={13} />
            <span className="truncate">{file.original_name || file.filename || 'Unnamed file'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
