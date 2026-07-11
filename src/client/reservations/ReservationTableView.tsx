import { FileText, Files } from 'lucide-react'
import type { Reservation } from './types'
import {
  getType,
  reservationRoute,
  reservationTimeRange,
  reservationTitle,
  TRANSPORT_TYPES,
} from './model'

export const TABLE_COLUMNS = [
  { key: 'type', label: 'Booking type' },
  { key: 'status', label: 'Status' },
  { key: 'title', label: 'Title' },
  { key: 'date', label: 'Date' },
  { key: 'time', label: 'Time' },
  { key: 'route', label: 'Locations' },
  { key: 'code', label: 'Confirmation code' },
  { key: 'files', label: 'Files' },
] as const

export type TableColumnKey = (typeof TABLE_COLUMNS)[number]['key']

interface ReservationTableViewProps {
  reservations: Reservation[]
  visibleColumns: Set<TableColumnKey>
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
    <span className={`${status === 'confirmed' ? 'trek-chip trek-chip--success' : 'trek-chip trek-chip--warning'} gap-1.5 px-2 py-1 text-[11px] font-extrabold`}>
      <span className="size-1.5 rounded-full bg-current" />
      {status === 'confirmed' ? 'Confirmed' : 'Pending'}
    </span>
  )
}

function ReservationTableRow({ reservation, visibleColumns }: { reservation: Reservation; visibleColumns: Set<TableColumnKey> }) {
  const typeInfo = getType(reservation.type)
  const TypeIcon = typeInfo.Icon
  const route = reservationRoute(reservation)
  const routeOrPlace = TRANSPORT_TYPES.has(reservation.type ?? '') && route.length >= 2
    ? route.join(' → ')
    : reservation.location || reservation.accommodation_name || reservation.place_name || ''
  const hasCode = Boolean(reservation.confirmation_number)

  return (
    <tr>
      {visibleColumns.has('type') ? (
        <td>
          <span className="trek-chip inline-flex min-w-0 max-w-[150px] items-center gap-[7px] font-semibold text-content-muted" style={{ '--reservation-color': typeInfo.color } as React.CSSProperties}>
            <TypeIcon className="shrink-0 text-[var(--reservation-color)]" size={14} />
            <span className="truncate">{typeInfo.label}</span>
          </span>
        </td>
      ) : null}
      {visibleColumns.has('status') ? (
        <td>
          <StatusBadge reservation={reservation} />
        </td>
      ) : null}
      {visibleColumns.has('title') ? (
        <td className="max-w-[280px]">
          <strong className="inline-block max-w-[230px] truncate font-bold text-content">{reservationTitle(reservation)}</strong>
          {reservation.needs_review ? <span className="ml-[7px] inline-flex rounded-full bg-[var(--warning-soft)] px-1.5 py-0.5 align-top text-[10px] font-extrabold text-warning">Needs review</span> : null}
        </td>
      ) : null}
      {visibleColumns.has('date') ? <td className="whitespace-nowrap font-semibold text-content">{tableDateRange(reservation) || <span className="font-normal text-content-faint">—</span>}</td> : null}
      {visibleColumns.has('time') ? <td className="whitespace-nowrap">{reservationTimeRange(reservation) || <span className="text-content-faint">-</span>}</td> : null}
      {visibleColumns.has('route') ? <td className="max-w-[260px] truncate text-content-muted">{routeOrPlace || <span className="text-content-faint">—</span>}</td> : null}
      {visibleColumns.has('code') ? (
        <td className="whitespace-nowrap font-mono">
          {hasCode ? (
            <span className="inline-block max-w-[130px] truncate text-content" title={reservation.confirmation_number || undefined}>
              {reservation.confirmation_number}
            </span>
          ) : (
            <span className="text-content-faint">—</span>
          )}
        </td>
      ) : null}
      {visibleColumns.has('files') ? (
        <td className="whitespace-nowrap">
          {reservation.files?.length ? (
            <span
              className="inline-flex items-center gap-1.25 text-content-muted"
              title={reservation.files.map((file) => file.original_name || file.filename || 'Unnamed file').join(', ')}
            >
              {reservation.files.length === 1 ? <FileText size={13} /> : <Files size={13} />}
              <span>{reservation.files.length}</span>
            </span>
          ) : (
            <span className="text-content-faint">—</span>
          )}
        </td>
      ) : null}
    </tr>
  )
}

export function ReservationTableView({ reservations, visibleColumns }: ReservationTableViewProps) {
  return (
    <div className="trek-card overflow-auto rounded-xl p-0">
        <table className="w-full min-w-[980px] border-collapse text-[13px] [&_td]:border-b [&_td]:border-edge-faint [&_td]:px-[11px] [&_td]:py-2.5 [&_td]:text-left [&_td]:align-middle [&_th]:sticky [&_th]:top-0 [&_th]:z-1 [&_th]:border-b [&_th]:border-edge-faint [&_th]:bg-surface-secondary [&_th]:px-[11px] [&_th]:py-[9px] [&_th]:text-left [&_th]:text-[10px] [&_th]:font-extrabold [&_th]:uppercase [&_th]:text-content-faint [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-surface-hover">
          <thead>
            <tr>
              {TABLE_COLUMNS.filter((column) => visibleColumns.has(column.key)).map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reservations.map((reservation) => (
              <ReservationTableRow key={reservation.id} reservation={reservation} visibleColumns={visibleColumns} />
            ))}
          </tbody>
        </table>
    </div>
  )
}
