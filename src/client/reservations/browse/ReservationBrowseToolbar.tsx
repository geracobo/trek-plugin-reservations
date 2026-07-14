import { useEffect, useRef, useState } from 'react'
import {
  CalendarDays,
  ChevronDown,
  Filter,
  Hotel,
  LayoutGrid,
  Plus,
  Route,
  Search,
  SlidersHorizontal,
  Table2,
  Ticket,
} from 'lucide-react'
import type { StatusFilter, ViewMode } from '../types'
import type { TypeOption } from '../model'
import type { CardFieldKey } from '../cards/ReservationCardSections'
import type { TableColumnKey } from '../table/ReservationTableColumns'
import type { ReservationCategory, ReservationGroupBy, ReservationSortKey, SortDirection } from './browse-logic'
import { ReservationDisplayMenu } from './ReservationDisplayMenu'
import { ReservationFilterMenu } from './ReservationFilterMenu'

const CATEGORY_OPTIONS = [
  { value: 'transportation', label: 'Transportation', Icon: Route },
  { value: 'accommodation', label: 'Accommodation', Icon: Hotel },
  { value: 'booking', label: 'Booking', Icon: Ticket },
] as const

const triggerClass =
  'trek-btn trek-btn--ghost min-h-9 rounded-[10px] border border-edge bg-surface px-2.5 py-[7px] text-xs font-semibold text-content-muted max-[720px]:w-full'

interface ReservationBrowseToolbarProps {
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
  sortKey: ReservationSortKey
  sortDirection: SortDirection
  groupBy: ReservationGroupBy
  visibleColumns: Set<TableColumnKey>
  visibleCardFields: Set<CardFieldKey>
  hasActiveFilters: boolean
  onCategoryChange: (category: ReservationCategory) => void
  onViewModeChange: (viewMode: ViewMode) => void
  onSearchChange: (search: string) => void
  onTypeToggle: (type: string) => void
  onStatusChange: (status: StatusFilter) => void
  onSortChange: (key: ReservationSortKey, direction: SortDirection) => void
  onGroupChange: (groupBy: ReservationGroupBy) => void
  onColumnToggle: (column: TableColumnKey) => void
  onCardFieldToggle: (field: CardFieldKey) => void
  onClearFilters: () => void
  onResetView: () => void
  onAddReservation: () => void
}

export function ReservationBrowseToolbar(props: ReservationBrowseToolbarProps) {
  const [filterOpen, setFilterOpen] = useState(false)
  const [viewOptionsOpen, setViewOptionsOpen] = useState(false)
  const menuAreaRef = useRef<HTMLDivElement>(null)
  const filterCount = props.selectedTypes.size + (props.statusFilter === 'all' ? 0 : 1)
  const selectCategory = (category: ReservationCategory) => {
    setFilterOpen(false)
    props.onCategoryChange(category)
  }
  const closeMenus = () => {
    setFilterOpen(false)
    setViewOptionsOpen(false)
  }
  const toggleMenu = (menu: 'filter' | 'view') => {
    if (menu === 'filter') {
      setFilterOpen((open) => !open)
      setViewOptionsOpen(false)
    } else {
      setViewOptionsOpen((open) => !open)
      setFilterOpen(false)
    }
  }

  useEffect(() => {
    const closeOnOutsideInteraction = (event: PointerEvent) => {
      if (menuAreaRef.current && !menuAreaRef.current.contains(event.target as Node)) closeMenus()
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenus()
    }
    document.addEventListener('pointerdown', closeOnOutsideInteraction)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideInteraction)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  return (
    <>
      <header className="mb-3 flex flex-wrap items-center gap-4 rounded-[18px] bg-surface-muted py-3.5 pr-4 pl-[22px] max-[720px]:w-full max-[720px]:px-4">
        <h1 className="m-0 shrink-0 text-lg font-semibold leading-tight">Reservations</h1>
        {props.reservationCount > 0 ? (
          <>
            <div className="h-[22px] w-px shrink-0 bg-edge-faint max-[720px]:hidden" />
            <div
              className="flex min-w-0 flex-[1_1_360px] flex-wrap items-center gap-1"
              aria-label="Reservation categories"
            >
              <CategoryButton
                active={props.category === 'all'}
                label="All"
                count={props.reservationCount}
                onClick={() => selectCategory('all')}
              />
              {CATEGORY_OPTIONS.map(({ value, label, Icon }) => (
                <CategoryButton
                  key={value}
                  active={props.category === value}
                  label={label}
                  count={props.categoryCounts[value]}
                  Icon={Icon}
                  onClick={() => selectCategory(value)}
                />
              ))}
            </div>
          </>
        ) : null}
        <div className="ml-auto inline-flex shrink-0 items-center gap-2 max-[720px]:ml-0 max-[720px]:w-full max-[720px]:items-stretch">
          <div
            className="reservation-view-mode inline-flex min-h-[34px] items-center gap-[3px] rounded-[11px] bg-surface p-[3px] shadow-xs [&_.trek-btn]:min-h-7 [&_.trek-btn]:rounded-lg [&_.trek-btn]:px-[9px] [&_.trek-btn]:py-[5px] [&_.trek-btn]:text-xs max-[720px]:flex-1 max-[720px]:[&_.trek-btn]:flex-1"
            aria-label="View mode"
          >
            <ViewButton
              active={props.viewMode === 'cards'}
              label="Cards"
              Icon={LayoutGrid}
              onClick={() => props.onViewModeChange('cards')}
            />
            <ViewButton
              active={props.viewMode === 'table'}
              label="Table"
              Icon={Table2}
              onClick={() => props.onViewModeChange('table')}
            />
            <ViewButton
              active={props.viewMode === 'calendar'}
              label="Calendar"
              Icon={CalendarDays}
              onClick={() => props.onViewModeChange('calendar')}
            />
          </div>
          <button
            type="button"
            className="trek-btn trek-btn--primary min-h-[38px] rounded-[10px] px-3.5 py-2 text-[13px] font-semibold max-[720px]:flex-1"
            onClick={props.onAddReservation}
          >
            <Plus size={14} />
            <span>Reservation</span>
          </button>
        </div>
      </header>

      <div
        ref={menuAreaRef}
        className="mb-[22px] flex flex-wrap items-center gap-2.5 px-0.5 max-[720px]:w-full max-[720px]:items-stretch"
      >
        <div className="relative min-w-[220px] flex-[1_1_280px] max-[720px]:w-full">
          <Search
            className="pointer-events-none absolute top-1/2 left-[11px] z-1 -translate-y-1/2 text-content-faint"
            size={15}
          />
          <input
            className="trek-input reservation-search-input min-h-[38px] text-[13px]"
            style={{ paddingLeft: 36 }}
            value={props.search}
            onChange={(event) => props.onSearchChange(event.target.value)}
            type="search"
            placeholder="Search reservations"
          />
        </div>
        <div className="relative max-[720px]:w-full">
          <button
            type="button"
            className={triggerClass}
            aria-expanded={filterOpen}
            aria-haspopup="dialog"
            onClick={() => toggleMenu('filter')}
          >
            <Filter size={14} />
            <span>Filters</span>
            {filterCount ? <Count count={filterCount} /> : null}
            <ChevronDown
              className={filterOpen ? 'rotate-180 transition-transform' : 'transition-transform'}
              size={14}
            />
          </button>
          {filterOpen ? (
            <ReservationFilterMenu
              statusFilter={props.statusFilter}
              types={props.secondaryTypes}
              selectedTypes={props.selectedTypes}
              typeCounts={props.typeCounts}
              hasActiveFilters={props.hasActiveFilters}
              onStatusChange={props.onStatusChange}
              onTypeToggle={props.onTypeToggle}
              onClearFilters={props.onClearFilters}
            />
          ) : null}
        </div>
        <div className="relative max-[720px]:w-full">
          <button
            type="button"
            className={triggerClass}
            aria-expanded={viewOptionsOpen}
            aria-haspopup="dialog"
            onClick={() => toggleMenu('view')}
          >
            <SlidersHorizontal size={14} />
            <span>View</span>
            <ChevronDown
              className={viewOptionsOpen ? 'rotate-180 transition-transform' : 'transition-transform'}
              size={14}
            />
          </button>
          {viewOptionsOpen ? (
            <ReservationDisplayMenu
              viewMode={props.viewMode}
              sortKey={props.sortKey}
              sortDirection={props.sortDirection}
              groupBy={props.groupBy}
              visibleColumns={props.visibleColumns}
              visibleCardFields={props.visibleCardFields}
              onSortChange={props.onSortChange}
              onGroupChange={props.onGroupChange}
              onColumnToggle={props.onColumnToggle}
              onCardFieldToggle={props.onCardFieldToggle}
              onResetView={props.onResetView}
            />
          ) : null}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2 max-[720px]:ml-0 max-[720px]:w-full">
          <span className="ml-auto whitespace-nowrap text-xs font-semibold text-content-faint">
            {props.filteredCount} / {props.reservationCount}
          </span>
        </div>
      </div>
    </>
  )
}

function CategoryButton({
  active,
  label,
  count,
  Icon,
  onClick,
}: {
  active: boolean
  label: string
  count: number
  Icon?: typeof Route
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="inline-flex min-h-8 cursor-pointer items-center gap-[7px] rounded-full border-0 bg-transparent px-[11px] py-1.5 text-xs text-content-muted aria-pressed:bg-surface aria-pressed:font-medium aria-pressed:text-content [&>svg]:text-content-faint"
      aria-pressed={active}
      onClick={onClick}
    >
      {Icon ? <Icon size={13} /> : null}
      {label}
      <Count count={count} />
    </button>
  )
}
function ViewButton({
  active,
  label,
  Icon,
  onClick,
}: {
  active: boolean
  label: string
  Icon: typeof Route
  onClick: () => void
}) {
  return (
    <button type="button" className="trek-btn trek-btn--ghost" aria-pressed={active} onClick={onClick} title={label}>
      <Icon size={15} />
      <span>{label}</span>
    </button>
  )
}
function Count({ count }: { count: number }) {
  return (
    <span className="min-w-[18px] rounded-full bg-surface-muted px-[5px] py-px text-center text-[10px] font-extrabold text-content-faint">
      {count}
    </span>
  )
}
