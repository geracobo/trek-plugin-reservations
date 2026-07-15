import { ExternalLink, FileText, MapPin, Plane, StickyNote } from 'lucide-react'
import type { Accommodation, Day, Reservation, Trip } from '../types'
import { getType } from '../model'
import { getReservationPresentation } from '../presentation'
import { ReservationCardField, ReservationCardFieldRoute } from './ReservationCardFields'
import type { CardFieldKey } from './ReservationCardSections'

interface ReservationCardDetailsProps {
  reservation: Reservation
  trip: Trip | null
  days: Day[]
  accommodations: Accommodation[]
  selectedFields: Set<CardFieldKey>
}

export function ReservationCardDetails({
  reservation,
  trip,
  days,
  accommodations,
  selectedFields,
}: ReservationCardDetailsProps) {
  const presentation = getReservationPresentation(reservation)
  const context = { days, accommodations, trip }
  const detailFields = presentation.getDetailFields(reservation, context).slice(0, 8)
  const location = presentation.getLocation(reservation, { days, accommodations })
  const attachedFiles = reservation.files ?? []
  const url = reservation.url || reservation.booking_url
  const TypeIcon = getType(reservation.type).Icon
  const scheduleContent = presentation.getScheduleContent(reservation, context)
  const tripDaysContent = presentation.getTripDaysContent(reservation, context)

  return (
    <div className="flex flex-1 flex-col gap-3 p-3.5">
      {selectedFields.has('tripDays') ? (
        <ReservationCardField label="Trip days" value={tripDaysContent} centered />
      ) : null}

      {selectedFields.has('schedule') ? (
        <ReservationCardField label="Schedule" value={scheduleContent} centered />
      ) : null}

      {selectedFields.has('details') && (reservation.confirmation_number || detailFields.length > 0) ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2.5">
          <ReservationCardField label="Confirmation code" value={reservation.confirmation_number} mono centered />
          {detailFields.map(({ key, cardWidth, cardAlignment, ...field }) => (
            <ReservationCardField
              key={key}
              {...field}
              centered={cardAlignment === 'center'}
              className={cardWidth === 'full' ? 'col-span-full' : ''}
            />
          ))}
        </div>
      ) : null}

      {selectedFields.has('location') && location ? (
        <ReservationCardField label="Location" value={location} Icon={MapPin} />
      ) : null}

      {selectedFields.has('location') ? (
        <ReservationCardFieldRoute
          reservation={reservation}
          Icon={TypeIcon || Plane}
          days={days}
          accommodations={accommodations}
        />
      ) : null}

      {selectedFields.has('files') && attachedFiles.length > 0 ? <ReservationCardFiles files={attachedFiles} /> : null}

      {selectedFields.has('notes') && reservation.notes ? (
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
