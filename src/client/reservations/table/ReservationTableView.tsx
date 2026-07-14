import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { Reservation, ReservationFile } from '../types'
import { ReservationAttachmentDialog } from '../attachments/ReservationAttachments'
import { groupReservations } from '../browse/browse-logic'
import type { ReservationGroupBy } from '../browse/browse-logic'
import { RESERVATION_TABLE_COLUMNS } from './ReservationTableColumns'
import type { TableColumnKey } from './ReservationTableColumns'

interface ReservationTableViewProps {
  reservations: Reservation[]
  visibleColumns: Set<TableColumnKey>
  groupBy: ReservationGroupBy
  onEdit: (reservation: Reservation) => void
  onDelete: (reservation: Reservation) => void
}

function ReservationTableRow({
  reservation,
  visibleColumns,
  onEdit,
  onDelete,
  onShowFiles,
}: {
  reservation: Reservation
  visibleColumns: Set<TableColumnKey>
  onEdit: (reservation: Reservation) => void
  onDelete: (reservation: Reservation) => void
  onShowFiles: (files: ReservationFile[]) => void
}) {
  return (
    <tr>
      {RESERVATION_TABLE_COLUMNS.filter((column) => visibleColumns.has(column.key)).map((column) => (
        <td
          key={column.key}
          className={
            column.key === 'title'
              ? 'max-w-[280px]'
              : column.key === 'date'
                ? 'whitespace-nowrap font-semibold text-content'
                : column.key === 'time' || column.key === 'files'
                  ? 'whitespace-nowrap'
                  : column.key === 'route'
                    ? 'max-w-[260px] truncate text-content-muted'
                    : column.key === 'code'
                      ? 'whitespace-nowrap font-mono'
                      : undefined
          }
        >
          {column.render(reservation, { onEdit, onShowFiles })}
        </td>
      ))}
      <td className="whitespace-nowrap text-center">
        <div className="flex justify-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(reservation)}
            className="rounded-md p-1.5 text-content-muted hover:bg-surface-hover hover:text-content"
            title="Edit reservation"
            aria-label="Edit reservation"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(reservation)}
            className="rounded-md p-1.5 text-content-muted hover:bg-[var(--danger-soft)] hover:text-danger"
            title="Delete reservation"
            aria-label="Delete reservation"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  )
}

export function ReservationTableView({
  reservations,
  visibleColumns,
  groupBy,
  onEdit,
  onDelete,
}: ReservationTableViewProps) {
  const [filesPopup, setFilesPopup] = useState<ReservationFile[] | null>(null)
  const groups = groupReservations(reservations, groupBy)
  return (
    <>
      <div className="trek-card overflow-auto rounded-xl p-0">
        <table className="w-full min-w-[980px] border-collapse text-[13px] [&_td]:border-b [&_td]:border-edge-faint [&_td]:px-[11px] [&_td]:py-2.5 [&_td]:text-left [&_td]:align-middle [&_th]:sticky [&_th]:top-0 [&_th]:z-1 [&_th]:border-b [&_th]:border-edge-faint [&_th]:bg-surface-secondary [&_th]:px-[11px] [&_th]:py-[9px] [&_th]:text-left [&_th]:text-[10px] [&_th]:font-extrabold [&_th]:uppercase [&_th]:text-content-faint [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-surface-hover">
          <thead>
            <tr>
              {RESERVATION_TABLE_COLUMNS.filter((column) => visibleColumns.has(column.key)).map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {groups.flatMap((group) => [
              ...(groupBy === 'none'
                ? []
                : [
                    <tr key={`group-${group.key}`} className="bg-surface-muted hover:!bg-surface-muted">
                      <th
                        colSpan={visibleColumns.size + 1}
                        className="!sticky-[unset] !bg-surface-muted !py-2 !text-[10px] !text-content-muted"
                      >
                        {group.title} <span className="ml-1 text-content-faint">{group.reservations.length}</span>
                      </th>
                    </tr>,
                  ]),
              ...group.reservations.map((reservation) => (
                <ReservationTableRow
                  key={reservation.id}
                  reservation={reservation}
                  visibleColumns={visibleColumns}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onShowFiles={setFilesPopup}
                />
              )),
            ])}
          </tbody>
        </table>
      </div>
      <ReservationAttachmentDialog files={filesPopup} onClose={() => setFilesPopup(null)} />
    </>
  )
}
