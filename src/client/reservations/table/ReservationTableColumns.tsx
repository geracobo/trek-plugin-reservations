import { FileText, Files } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Reservation, ReservationFile } from '../types'
import { getType, reservationRoute, reservationTimeRange, reservationTitle, TRANSPORT_TYPES } from '../model'
import { openReservationFile, reservationFileName } from '../attachments/ReservationAttachments'

export const TABLE_COLUMN_KEYS = ['type', 'status', 'title', 'date', 'time', 'route', 'code', 'files'] as const

export type TableColumnKey = (typeof TABLE_COLUMN_KEYS)[number]

export interface ReservationTableColumnContext {
  onEdit: (reservation: Reservation) => void
  onShowFiles: (files: ReservationFile[]) => void
}

export interface ReservationTableColumn {
  key: TableColumnKey
  label: string
  render: (reservation: Reservation, context: ReservationTableColumnContext) => ReactNode
}

function tableDateRange(reservation: Reservation) {
  const format = (value: string | null | undefined) => {
    if (!value) return ''
    try {
      return new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      })
    } catch {
      return value
    }
  }
  const start = reservation.reservation_time?.split(/[T ]/)[0]
  const end = reservation.reservation_end_time?.split(/[T ]/)[0]
  const formattedStart = format(start)
  const formattedEnd = format(end)
  return formattedStart && formattedEnd && start !== end
    ? `${formattedStart} – ${formattedEnd}`
    : formattedStart || formattedEnd
}

function StatusBadge({ reservation }: { reservation: Reservation }) {
  const status = reservation.status === 'confirmed' ? 'confirmed' : 'pending'
  return (
    <span
      className={`${status === 'confirmed' ? 'trek-chip trek-chip--success' : 'trek-chip trek-chip--warning'} gap-1.5 px-2 py-1 text-[11px] font-extrabold`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status === 'confirmed' ? 'Confirmed' : 'Pending'}
    </span>
  )
}

export const RESERVATION_TABLE_COLUMNS: ReservationTableColumn[] = [
  {
    key: 'type',
    label: 'Booking type',
    render: (reservation) => {
      const typeInfo = getType(reservation.type)
      const TypeIcon = typeInfo.Icon
      return (
        <span
          className="trek-chip inline-flex min-w-0 max-w-[150px] items-center gap-[7px] font-semibold text-content-muted"
          style={{ '--reservation-color': typeInfo.color } as React.CSSProperties}
        >
          <TypeIcon className="shrink-0 text-[var(--reservation-color)]" size={14} />
          <span className="truncate">{typeInfo.label}</span>
        </span>
      )
    },
  },
  { key: 'status', label: 'Status', render: (reservation) => <StatusBadge reservation={reservation} /> },
  {
    key: 'title',
    label: 'Title',
    render: (reservation, { onEdit }) => (
      <>
        <button
          type="button"
          className="inline-block max-w-[230px] cursor-pointer truncate border-0 bg-transparent p-0 text-left font-bold text-content"
          onClick={() => onEdit(reservation)}
        >
          {reservationTitle(reservation)}
        </button>
        {reservation.needs_review ? (
          <span className="ml-[7px] inline-flex rounded-full bg-[var(--warning-soft)] px-1.5 py-0.5 align-top text-[10px] font-extrabold text-warning">
            Needs review
          </span>
        ) : null}
      </>
    ),
  },
  {
    key: 'date',
    label: 'Date',
    render: (reservation) => tableDateRange(reservation) || <span className="font-normal text-content-faint">—</span>,
  },
  {
    key: 'time',
    label: 'Time',
    render: (reservation) => reservationTimeRange(reservation) || <span className="text-content-faint">-</span>,
  },
  {
    key: 'route',
    label: 'Locations',
    render: (reservation) => {
      const route = reservationRoute(reservation)
      const routeOrPlace =
        TRANSPORT_TYPES.has(reservation.type ?? '') && route.length >= 2
          ? route.join(' → ')
          : reservation.location || reservation.accommodation_name || reservation.place_name || ''
      return routeOrPlace || <span className="text-content-faint">—</span>
    },
  },
  {
    key: 'code',
    label: 'Confirmation code',
    render: (reservation) =>
      reservation.confirmation_number ? (
        <span className="inline-block max-w-[130px] truncate text-content" title={reservation.confirmation_number}>
          {reservation.confirmation_number}
        </span>
      ) : (
        <span className="text-content-faint">—</span>
      ),
  },
  {
    key: 'files',
    label: 'Files',
    render: (reservation, { onShowFiles }) =>
      reservation.files?.length ? (
        <button
          type="button"
          onClick={() =>
            reservation.files && reservation.files.length === 1
              ? openReservationFile(reservation.files[0])
              : onShowFiles(reservation.files || [])
          }
          className="inline-flex cursor-pointer items-center gap-1.25 bg-transparent p-0 text-content-muted hover:text-content"
          title={reservation.files.map(reservationFileName).join(', ')}
        >
          {reservation.files.length === 1 ? <FileText size={13} /> : <Files size={13} />}
          <span>{reservation.files.length}</span>
        </button>
      ) : (
        <span className="text-content-faint">—</span>
      ),
  },
]

export const DEFAULT_TABLE_COLUMNS = new Set<TableColumnKey>(TABLE_COLUMN_KEYS)
