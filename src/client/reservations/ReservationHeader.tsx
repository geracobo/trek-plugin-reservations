import { useState } from 'react'
import { CalendarDays, ChevronDown, Hotel, LayoutGrid, Plus, Route, Search, Table2, Ticket, X } from 'lucide-react'
import type { StatusFilter, ViewMode } from './types'
import type { TypeOption } from './model'

export type ReservationCategory = 'all' | 'transportation' | 'accommodation' | 'booking'

const CATEGORY_OPTIONS = [
  { value: 'transportation', label: 'Transportation', Icon: Route },
  { value: 'accommodation', label: 'Accommodation', Icon: Hotel },
  { value: 'booking', label: 'Booking', Icon: Ticket },
] as const

const menuTriggerClass =
  'trek-btn trek-btn--ghost min-h-9 rounded-[10px] border border-edge bg-surface px-2.5 py-[7px] text-xs font-semibold text-content-muted max-[720px]:w-full'
const menuPanelClass =
  'absolute top-[calc(100%+6px)] z-20 min-w-[190px] rounded-xl border border-edge bg-surface p-[7px] shadow-lg max-[720px]:w-full'
const menuItemClass =
  'flex min-h-[34px] w-full items-center gap-2 rounded-lg px-[7px] py-[5px] text-left text-xs font-semibold text-content-muted hover:bg-surface-hover'

interface ReservationHeaderProps {
  reservationCount: number
  filteredCount: number
  category: ReservationCategory
  categoryCounts: Record<Exclude<ReservationCategory, 'all'>, number>
  viewMode: ViewMode
  search: string
  secondaryTypes: TypeOption[]
  selectedTypes: Set<string>
  typeCounts: Record<string, number>
  statusFilter: StatusFilter
  hasActiveFilters: boolean
  onCategoryChange: (category: ReservationCategory) => void
  onViewModeChange: (viewMode: ViewMode) => void
  onSearchChange: (search: string) => void
  onTypeToggle: (type: string) => void
  onStatusChange: (status: StatusFilter) => void
  onClearFilters: () => void
  onAddReservation: () => void
}

export function ReservationHeader({
  reservationCount,
  filteredCount,
  category,
  categoryCounts,
  viewMode,
  search,
  secondaryTypes,
  selectedTypes,
  typeCounts,
  statusFilter,
  hasActiveFilters,
  onCategoryChange,
  onViewModeChange,
  onSearchChange,
  onTypeToggle,
  onStatusChange,
  onClearFilters,
  onAddReservation,
}: ReservationHeaderProps) {
  const [typesOpen, setTypesOpen] = useState(false)

  const selectCategory = (next: ReservationCategory) => {
    setTypesOpen(false)
    onCategoryChange(next)
  }

  const clearFilters = () => {
    setTypesOpen(false)
    onClearFilters()
  }

  return (
    <>
      <header className="mb-3 flex flex-wrap items-center gap-4 rounded-[18px] bg-surface-muted py-3.5 pr-4 pl-[22px] max-[720px]:w-full">
        <div className="flex min-w-0 shrink-0 items-center">
          <h1 className="m-0 text-lg font-semibold leading-tight">Reservations</h1>
        </div>

        {reservationCount > 0 ? (
          <>
            <div className="h-[22px] w-px shrink-0 bg-edge-faint max-[720px]:hidden" />
            <div
              className="flex min-w-0 flex-[1_1_360px] flex-wrap items-center gap-1"
              aria-label="Reservation categories"
            >
              <button
                type="button"
                className="inline-flex min-h-8 cursor-pointer items-center gap-[7px] rounded-full border-0 bg-transparent px-[11px] py-1.5 text-xs text-content-muted aria-pressed:bg-surface aria-pressed:font-medium aria-pressed:text-content"
                aria-pressed={category === 'all'}
                onClick={() => selectCategory('all')}
              >
                All
                <span className="min-w-[19px] rounded-full bg-surface-muted px-1.5 py-px text-center text-[10px] font-extrabold text-content-faint">
                  {reservationCount}
                </span>
              </button>
              {CATEGORY_OPTIONS.map((option) => {
                const Icon = option.Icon
                return (
                  <button
                    type="button"
                    key={option.value}
                    className="inline-flex min-h-8 cursor-pointer items-center gap-[7px] rounded-full border-0 bg-transparent px-[11px] py-1.5 text-xs text-content-muted aria-pressed:bg-surface aria-pressed:font-medium aria-pressed:text-content [&>svg]:text-content-faint"
                    aria-pressed={category === option.value}
                    onClick={() => selectCategory(option.value)}
                  >
                    <Icon size={13} />
                    {option.label}
                    <span className="min-w-[19px] rounded-full bg-surface-muted px-1.5 py-px text-center text-[10px] font-extrabold text-content-faint">
                      {categoryCounts[option.value]}
                    </span>
                  </button>
                )
              })}
            </div>
          </>
        ) : null}

        <div className="ml-auto inline-flex shrink-0 items-center gap-2 max-[720px]:ml-0 max-[720px]:w-full max-[720px]:items-stretch">
          <div
            className="reservation-view-mode inline-flex min-h-[34px] items-center gap-[3px] rounded-[11px] bg-surface p-[3px] shadow-xs [&_.trek-btn]:min-h-7 [&_.trek-btn]:rounded-lg [&_.trek-btn]:px-[9px] [&_.trek-btn]:py-[5px] [&_.trek-btn]:text-xs max-[720px]:w-full max-[720px]:[&_.trek-btn]:flex-1"
            aria-label="View mode"
          >
            <button
              type="button"
              className="trek-btn trek-btn--ghost"
              aria-pressed={viewMode === 'cards'}
              onClick={() => onViewModeChange('cards')}
              title="Cards"
            >
              <LayoutGrid size={15} />
              <span>Cards</span>
            </button>
            <button
              type="button"
              className="trek-btn trek-btn--ghost"
              aria-pressed={viewMode === 'table'}
              onClick={() => onViewModeChange('table')}
              title="Table"
            >
              <Table2 size={15} />
              <span>Table</span>
            </button>
            <button
              type="button"
              className="trek-btn trek-btn--ghost"
              aria-pressed={viewMode === 'calendar'}
              onClick={() => onViewModeChange('calendar')}
              title="Calendar"
            >
              <CalendarDays size={15} />
              <span>Calendar</span>
            </button>
          </div>
          <button
            type="button"
            className="trek-btn trek-btn--primary min-h-[38px] rounded-[10px] px-3.5 py-2 text-[13px] font-semibold max-[720px]:w-full"
            onClick={onAddReservation}
          >
            <Plus size={14} />
            <span>Reservation</span>
          </button>
        </div>
      </header>

      <div className="mb-[22px] flex flex-wrap items-center gap-2.5 px-0.5 max-[720px]:w-full max-[720px]:items-stretch">
        <div className="relative min-w-[220px] flex-[1_1_280px] max-[720px]:w-full">
          <Search
            className="pointer-events-none absolute top-1/2 left-[11px] z-1 -translate-y-1/2 text-content-faint"
            size={15}
          />
          <input
            className="trek-input reservation-search-input min-h-[38px] text-[13px]"
            style={{ paddingLeft: 36 }}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            type="search"
            placeholder="Search reservations"
          />
        </div>

        {secondaryTypes.length > 0 ? (
          <div className="relative max-[720px]:w-full">
            <button
              type="button"
              className={menuTriggerClass}
              aria-expanded={typesOpen}
              aria-haspopup="menu"
              onClick={() => setTypesOpen((open) => !open)}
            >
              <span>Types</span>
              {selectedTypes.size > 0 ? (
                <span className="min-w-[18px] rounded-full bg-surface-muted px-[5px] py-px text-center text-[10px] font-extrabold text-content-faint">
                  {selectedTypes.size}
                </span>
              ) : null}
              <ChevronDown
                className={typesOpen ? 'rotate-180 transition-transform' : 'transition-transform'}
                size={14}
              />
            </button>
            {typesOpen ? (
              <div
                className={`${menuPanelClass} left-0 min-w-[220px]`}
                role="menu"
                aria-label={`${category} reservation types`}
              >
                {secondaryTypes.map((option) => {
                  const Icon = option.Icon
                  return (
                    <label key={option.value} className={menuItemClass}>
                      <input
                        type="checkbox"
                        checked={selectedTypes.has(option.value)}
                        onChange={() => onTypeToggle(option.value)}
                      />
                      <Icon size={13} style={{ color: option.color }} />
                      <span className="min-w-0 flex-1 truncate">{option.label}</span>
                      <span className="min-w-[18px] rounded-full bg-surface-muted px-[5px] py-px text-center text-[10px] font-extrabold text-content-faint">
                        {typeCounts[option.value]}
                      </span>
                    </label>
                  )
                })}
              </div>
            ) : null}
          </div>
        ) : null}

        <div
          className="reservation-status-filter inline-flex gap-[3px] rounded-[11px] bg-surface-muted p-[3px] [&_.trek-btn]:min-h-[30px] [&_.trek-btn]:rounded-lg [&_.trek-btn]:border-0 [&_.trek-btn]:px-2.5 [&_.trek-btn]:py-1.5 [&_.trek-btn]:text-xs [&_.trek-btn]:font-semibold max-[720px]:w-full"
          aria-label="Status filter"
        >
          {[
            ['all', 'All'],
            ['confirmed', 'Confirmed'],
            ['pending', 'Pending'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className="trek-btn trek-btn--ghost"
              aria-pressed={statusFilter === id}
              onClick={() => onStatusChange(id as StatusFilter)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 max-[720px]:ml-0 max-[720px]:w-full">
          {hasActiveFilters ? (
            <button type="button" className={`${menuTriggerClass} w-[120px]`} onClick={clearFilters}>
              <X className="shrink-0 text-content" size={14} strokeWidth={2.5} />
              Clear filters
            </button>
          ) : (
            <span className="inline-block min-h-9 w-[120px]" aria-hidden="true" />
          )}
          <span className="whitespace-nowrap text-xs font-semibold text-content-faint">
            {filteredCount} / {reservationCount}
          </span>
        </div>
      </div>
    </>
  )
}
