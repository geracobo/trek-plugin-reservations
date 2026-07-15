import { ArrowDownAZ, Check, Eye, ListFilter, Route, X } from 'lucide-react'
import type { ViewMode } from '../types'
import { CARD_FIELDS } from '../cards/ReservationCardSections'
import type { CardFieldKey } from '../cards/ReservationCardSections'
import { RESERVATION_TABLE_COLUMNS } from '../table/ReservationTableColumns'
import type { TableColumnKey } from '../table/ReservationTableColumns'
import type { ReservationGroupBy, ReservationSortKey, SortDirection } from './browse-logic'

const panelClass =
  'absolute top-[calc(100%+6px)] right-0 z-30 w-[min(330px,calc(100vw-32px))] rounded-xl border border-edge bg-surface p-2 shadow-lg max-[720px]:right-auto max-[720px]:left-0 max-[720px]:w-full'
const rowClass =
  'flex min-h-[34px] w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-content-muted hover:bg-surface-hover'

interface ReservationDisplayMenuProps {
  viewMode: ViewMode
  sortKey: ReservationSortKey
  sortDirection: SortDirection
  groupBy: ReservationGroupBy
  visibleColumns: Set<TableColumnKey>
  selectedCardFields: Set<CardFieldKey>
  onSortChange: (key: ReservationSortKey, direction: SortDirection) => void
  onGroupChange: (groupBy: ReservationGroupBy) => void
  onColumnToggle: (column: TableColumnKey) => void
  onCardFieldToggle: (field: CardFieldKey) => void
  onResetView: () => void
  embedded?: boolean
}

export function ReservationDisplayMenu(props: ReservationDisplayMenuProps) {
  const containerClass = props.embedded ? '' : panelClass
  if (props.viewMode === 'calendar') {
    return (
      <div
        className={containerClass}
        role={props.embedded ? undefined : 'dialog'}
        aria-label={props.embedded ? undefined : 'View options'}
      >
        <p className="px-2 py-3 text-xs leading-relaxed text-content-faint">
          Calendar entries are always placed by date. Display options are available in Cards and Table views.
        </p>
      </div>
    )
  }

  return (
    <div
      className={containerClass}
      role={props.embedded ? undefined : 'dialog'}
      aria-label={props.embedded ? undefined : 'View options'}
    >
      <OptionLabel label="Sort" Icon={ArrowDownAZ} bordered={false} />
      <div className="grid grid-cols-2 gap-1 px-1 pb-2">
        {(['date', 'title', 'type', 'status'] as const).map((key) => (
          <button
            key={key}
            type="button"
            className={`rounded-lg px-2 py-1.5 text-left text-xs font-semibold ${props.sortKey === key ? 'bg-surface-hover text-content' : 'text-content-muted hover:bg-surface-hover'}`}
            onClick={() =>
              props.onSortChange(key, props.sortKey === key && props.sortDirection === 'asc' ? 'desc' : 'asc')
            }
          >
            {key[0].toUpperCase() + key.slice(1)}
            {props.sortKey === key ? ` · ${props.sortDirection === 'asc' ? 'A–Z' : 'Z–A'}` : ''}
          </button>
        ))}
      </div>
      <OptionLabel label="Group" Icon={ListFilter} />
      <div className="grid grid-cols-2 gap-1 px-1 pb-2">
        {(
          [
            ['status', 'Status'],
            ['date', 'Date'],
            ['type', 'Type'],
            ['none', 'No grouping'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`rounded-lg px-2 py-1.5 text-left text-xs font-semibold ${props.groupBy === key ? 'bg-surface-hover text-content' : 'text-content-muted hover:bg-surface-hover'}`}
            onClick={() => props.onGroupChange(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {props.viewMode === 'table' ? (
        <>
          <OptionLabel label="Columns" Icon={Eye} />
          {RESERVATION_TABLE_COLUMNS.map((column) => (
            <ToggleRow
              key={column.key}
              label={column.label}
              checked={props.visibleColumns.has(column.key)}
              onClick={() => props.onColumnToggle(column.key)}
            />
          ))}
        </>
      ) : (
        <>
          <OptionLabel label="Card fields" Icon={Eye} />
          {CARD_FIELDS.map((field) => (
            <ToggleRow
              key={field.key}
              label={field.label}
              checked={props.selectedCardFields.has(field.key)}
              onClick={() => props.onCardFieldToggle(field.key)}
            />
          ))}
        </>
      )}
      <div className="mt-2 border-t border-edge-faint pt-2">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold text-content-muted hover:bg-surface-hover hover:text-content"
          onClick={props.onResetView}
        >
          <X size={13} /> Reset view
        </button>
      </div>
    </div>
  )
}

function OptionLabel({ label, Icon, bordered = true }: { label: string; Icon: typeof Route; bordered?: boolean }) {
  return (
    <p
      className={`flex items-center gap-1.5 px-2 pb-1 text-[10px] font-extrabold uppercase tracking-wide text-content-faint ${bordered ? 'border-t border-edge-faint pt-3' : 'pt-1'}`}
    >
      <Icon size={11} />
      {label}
    </p>
  )
}

function ToggleRow({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`${rowClass} ${checked ? 'text-content' : ''}`}
      aria-pressed={checked}
      onClick={onClick}
    >
      <span
        className={`grid size-4 place-items-center rounded border ${checked ? 'border-accent bg-accent text-white' : 'border-edge bg-surface'}`}
      >
        {checked ? <Check size={11} /> : null}
      </span>
      {label}
    </button>
  )
}
