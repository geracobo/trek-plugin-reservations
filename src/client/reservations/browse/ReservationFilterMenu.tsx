import { Check, X } from 'lucide-react'
import type { StatusFilter } from '../types'
import type { TypeOption } from '../model'

const rowClass =
  'flex min-h-[34px] w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-content-muted hover:bg-surface-hover'

export function ReservationFilterMenu({
  statusFilter,
  types,
  selectedTypes,
  typeCounts,
  hasActiveFilters,
  onStatusChange,
  onTypeToggle,
  onClearFilters,
  embedded = false,
}: {
  statusFilter: StatusFilter
  types: TypeOption[]
  selectedTypes: Set<string>
  typeCounts: Record<string, number>
  hasActiveFilters: boolean
  onStatusChange: (status: StatusFilter) => void
  onTypeToggle: (type: string) => void
  onClearFilters: () => void
  embedded?: boolean
}) {
  return (
    <div
      className={
        embedded
          ? ''
          : 'absolute top-[calc(100%+6px)] right-0 z-30 w-[min(330px,calc(100vw-32px))] rounded-xl border border-edge bg-surface p-2 shadow-lg'
      }
      role={embedded ? undefined : 'dialog'}
      aria-label={embedded ? undefined : 'Filter reservations'}
    >
      <p className="px-2 pt-1 pb-1 text-[10px] font-extrabold uppercase tracking-wide text-content-faint">Status</p>
      <div className="mb-2 grid grid-cols-3 gap-1">
        {(
          [
            ['all', 'All'],
            ['confirmed', 'Confirmed'],
            ['pending', 'Pending'],
          ] as const
        ).map(([status, label]) => (
          <button
            key={status}
            type="button"
            className={`rounded-lg px-2 py-2 text-xs font-semibold ${statusFilter === status ? 'bg-surface-hover text-content' : 'text-content-muted hover:bg-surface-hover'}`}
            onClick={() => onStatusChange(status)}
          >
            {label}
          </button>
        ))}
      </div>
      {types.length ? (
        <>
          <p className="border-t border-edge-faint px-2 pt-3 pb-1 text-[10px] font-extrabold uppercase tracking-wide text-content-faint">
            Types
          </p>
          {types.map((option) => {
            const Icon = option.Icon
            const selected = selectedTypes.has(option.value)
            return (
              <button
                key={option.value}
                type="button"
                className={`${rowClass} ${selected ? 'bg-surface-hover text-content hover:bg-surface-hover' : ''}`}
                onClick={() => onTypeToggle(option.value)}
              >
                <span
                  className={`grid size-4 place-items-center rounded border ${selected ? 'border-accent bg-accent text-white' : 'border-edge bg-surface'}`}
                >
                  {selected ? <Check size={11} /> : null}
                </span>
                <Icon size={14} style={{ color: option.color }} />
                <span className="flex-1 text-left">{option.label}</span>
                <span className="min-w-[18px] rounded-full bg-surface-muted px-[5px] py-px text-center text-[10px] font-extrabold text-content-faint">
                  {typeCounts[option.value] || 0}
                </span>
              </button>
            )
          })}
        </>
      ) : (
        <p className="px-2 py-3 text-xs text-content-faint">Choose a category to filter its types.</p>
      )}
      {hasActiveFilters ? (
        <div className="mt-2 border-t border-edge-faint pt-2">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold text-content-muted hover:bg-surface-hover hover:text-content"
            onClick={onClearFilters}
          >
            <X size={13} /> Clear filters
          </button>
        </div>
      ) : null}
    </div>
  )
}
