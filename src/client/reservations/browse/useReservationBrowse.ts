import { useMemo, useState } from 'react'
import type { Accommodation, Day, Reservation, StatusFilter, ViewMode } from '../types'
import {
  filterAndSortReservations,
  getType,
  reservationRoute,
  reservationStatus,
  reservationTitle,
  TRANSPORT_TYPES,
  TYPE_OPTIONS,
} from '../model'
import { DEFAULT_CARD_FIELDS } from '../cards/ReservationCardSections'
import type { CardFieldKey } from '../cards/ReservationCardSections'
import { DEFAULT_TABLE_COLUMNS } from '../table/ReservationTableColumns'
import type { TableColumnKey } from '../table/ReservationTableColumns'
import { sortReservations } from './browse-logic'
import type { ReservationCategory, ReservationGroupBy, ReservationSortKey, SortDirection } from './browse-logic'
import { getReservationPresentation } from '../presentation'

function reservationCategory(reservation: Reservation): Exclude<ReservationCategory, 'all'> {
  return getReservationPresentation(reservation).category
}

function countByType(reservations: Reservation[]) {
  return reservations.reduce<Record<string, number>>((counts, reservation) => {
    const type = reservation.type ?? 'other'
    counts[type] = (counts[type] ?? 0) + 1
    return counts
  }, {})
}

function reservationSearchText(reservation: Reservation) {
  return [
    reservationTitle(reservation),
    getType(reservation.type).label,
    reservationStatus(reservation),
    reservationRoute(reservation).join(' '),
    reservation.location || reservation.accommodation_name || reservation.place_name,
    reservation.confirmation_number,
    reservation.notes,
    reservation.external_source,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function useReservationBrowse({
  reservations,
  days,
  accommodations,
}: {
  reservations: Reservation[]
  days: Day[]
  accommodations: Accommodation[]
}) {
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [category, setCategory] = useState<ReservationCategory>('all')
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(() => new Set())
  const [sortKey, setSortKey] = useState<ReservationSortKey>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [cardGroupBy, setCardGroupBy] = useState<ReservationGroupBy>('status')
  const [tableGroupBy, setTableGroupBy] = useState<ReservationGroupBy>('none')
  const [timelineGroupBy, setTimelineGroupBy] = useState<ReservationGroupBy>('none')
  const [visibleColumns, setVisibleColumns] = useState<Set<TableColumnKey>>(() => new Set(DEFAULT_TABLE_COLUMNS))
  const [selectedCardFields, setSelectedCardFields] = useState<Set<CardFieldKey>>(() => new Set(DEFAULT_CARD_FIELDS))
  const [selectedTimelineFields, setSelectedTimelineFields] = useState<Set<CardFieldKey>>(
    () => new Set<CardFieldKey>(['schedule']),
  )

  const typeCounts = useMemo(() => countByType(reservations), [reservations])
  const categoryCounts = useMemo(
    () =>
      reservations.reduce<Record<Exclude<ReservationCategory, 'all'>, number>>(
        (counts, reservation) => {
          counts[reservationCategory(reservation)] += 1
          return counts
        },
        { transportation: 0, accommodation: 0, booking: 0 },
      ),
    [reservations],
  )
  const secondaryTypes = useMemo(
    () =>
      category === 'all'
        ? TYPE_OPTIONS.filter((option) => typeCounts[option.value])
        : TYPE_OPTIONS.filter(
            (option) => typeCounts[option.value] && reservationCategory({ id: 0, type: option.value }) === category,
          ),
    [category, typeCounts],
  )
  const filteredReservations = useMemo(() => {
    const query = search.trim().toLowerCase()
    const inCategory =
      category === 'all' ? reservations : reservations.filter((item) => reservationCategory(item) === category)
    return sortReservations(
      filterAndSortReservations(inCategory, selectedTypes, statusFilter, days, accommodations).filter(
        (reservation) => !query || reservationSearchText(reservation).includes(query),
      ),
      sortKey,
      sortDirection,
      { days, accommodations },
    )
  }, [reservations, category, selectedTypes, statusFilter, days, accommodations, search, sortKey, sortDirection])

  const groupBy = viewMode === 'table' ? tableGroupBy : viewMode === 'timeline' ? timelineGroupBy : cardGroupBy
  const toggleType = (type: string) => {
    setSelectedTypes((current) => {
      const next = new Set(current)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }
  const selectCategory = (next: ReservationCategory) => {
    setCategory(next)
    setSelectedTypes(new Set())
  }
  const clearFilters = () => {
    setSearch('')
    setSelectedTypes(new Set())
    setStatusFilter('all')
  }
  const toggleColumn = (column: TableColumnKey) => {
    setVisibleColumns((current) => {
      const next = new Set(current)
      if (next.has(column)) next.delete(column)
      else next.add(column)
      return next
    })
  }
  const toggleCardField = (field: CardFieldKey) => {
    setSelectedCardFields((current) => {
      const next = new Set(current)
      if (next.has(field)) next.delete(field)
      else next.add(field)
      return next
    })
  }
  const resetView = () => {
    setSortKey('date')
    setSortDirection('asc')
    if (viewMode === 'cards') {
      setCardGroupBy('status')
      setSelectedCardFields(new Set(DEFAULT_CARD_FIELDS))
    } else if (viewMode === 'table') {
      setTableGroupBy('none')
      setVisibleColumns(new Set(DEFAULT_TABLE_COLUMNS))
    } else if (viewMode === 'timeline') {
      setTimelineGroupBy('none')
      setSelectedTimelineFields(new Set<CardFieldKey>(['schedule']))
    }
  }

  return {
    viewMode,
    search,
    statusFilter,
    category,
    selectedTypes,
    sortKey,
    sortDirection,
    groupBy,
    visibleColumns,
    selectedCardFields,
    selectedTimelineFields,
    typeCounts,
    categoryCounts,
    secondaryTypes,
    filteredReservations,
    hasActiveFilters: Boolean(search.trim() || selectedTypes.size > 0 || statusFilter !== 'all'),
    setViewMode,
    setSearch,
    setStatusFilter,
    selectCategory,
    toggleType,
    setSort: (key: ReservationSortKey, direction: SortDirection) => {
      setSortKey(key)
      setSortDirection(direction)
    },
    setGroupBy: (nextGroupBy: ReservationGroupBy) => {
      if (viewMode === 'table') setTableGroupBy(nextGroupBy)
      else if (viewMode === 'timeline') setTimelineGroupBy(nextGroupBy)
      else setCardGroupBy(nextGroupBy)
    },
    toggleColumn,
    toggleCardField,
    toggleTimelineField: (field: CardFieldKey) => {
      setSelectedTimelineFields((current) => {
        const next = new Set(current)
        if (next.has(field)) next.delete(field)
        else next.add(field)
        return next
      })
    },
    clearFilters,
    resetView,
  }
}
