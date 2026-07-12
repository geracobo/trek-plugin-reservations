import { useEffect, useMemo, useState } from 'react'
import type {
  Accommodation,
  Cost,
  Day,
  Place,
  ReservationFile,
  ReservationsResponse,
  Reservation,
  StatusFilter,
  Trip,
  ViewMode,
} from './types'
import {
  filterAndSortReservations,
  getType,
  reservationRoute,
  reservationStatus,
  reservationTitle,
  TRANSPORT_TYPES,
  TYPE_OPTIONS,
} from './model'
import { ReservationCardView } from './ReservationCardView'
import { ReservationCalendarView } from './ReservationCalendarView'
import { ReservationTableView, TABLE_COLUMNS } from './ReservationTableView'
import type { TableColumnKey } from './ReservationTableView'
import { ReservationHeader } from './ReservationHeader'
import type { ReservationCategory } from './ReservationHeader'
import { ReservationEditor } from './editor/ReservationEditor'
import type { ReservationTypeCategory } from './editor/ReservationTypeSelector'

interface ReservationsPageState {
  tripId: number | null
  trip: Trip | null
  reservations: Reservation[]
  places: Place[]
  days: Day[]
  accommodations: Accommodation[]
  files: ReservationFile[]
  costs: Cost[]
  loading: boolean
  error: string | null
}

function reservationCategory(reservation: Reservation): Exclude<ReservationCategory, 'all'> {
  if (TRANSPORT_TYPES.has(reservation.type ?? '')) return 'transportation'
  if (reservation.type === 'hotel') return 'accommodation'
  return 'booking'
}

const defaultTableColumns = new Set<TableColumnKey>(TABLE_COLUMNS.map((column) => column.key))

function countByType(reservations: Reservation[]) {
  return reservations.reduce<Record<string, number>>((acc, reservation) => {
    const type = reservation.type ?? 'other'
    acc[type] = (acc[type] ?? 0) + 1
    return acc
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

export function ReservationsPage() {
  const [pageState, setPageState] = useState<ReservationsPageState>({
    tripId: null,
    trip: null,
    reservations: [],
    places: [],
    days: [],
    accommodations: [],
    files: [],
    costs: [],
    loading: true,
    error: null,
  })
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [category, setCategory] = useState<ReservationCategory>('all')
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(() => new Set())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null)
  const [editorSession, setEditorSession] = useState(0)

  useEffect(() => {
    return window.trek.onContext((ctx) => {
      const tripId = ctx.tripId ? Number(ctx.tripId) : null
      if (!tripId) {
        setPageState({
          tripId: null,
          trip: null,
          reservations: [],
          places: [],
          days: [],
          accommodations: [],
          files: [],
          costs: [],
          loading: false,
          error: 'Open this plugin from a trip page so TREK can provide a trip id.',
        })
        return
      }

      setPageState((previous) => {
        if (previous.tripId === tripId && !previous.error) return previous
        return { ...previous, tripId, loading: true, error: null }
      })

      window.trek
        .invoke<ReservationsResponse>(`/reservations?tripId=${encodeURIComponent(tripId)}`)
        .then((data) => {
          setPageState({
            tripId,
            trip: data.trip,
            reservations: Array.isArray(data.reservations) ? data.reservations : [],
            places: Array.isArray(data.places) ? data.places : [],
            days: Array.isArray(data.days) ? data.days : [],
            accommodations: Array.isArray(data.accommodations) ? data.accommodations : [],
            files: Array.isArray(data.files) ? data.files : [],
            costs: Array.isArray(data.costs) ? data.costs : [],
            loading: false,
            error: null,
          })
        })
        .catch((error: unknown) => {
          setPageState({
            tripId,
            trip: null,
            reservations: [],
            places: [],
            days: [],
            accommodations: [],
            files: [],
            costs: [],
            loading: false,
            error: error instanceof Error ? error.message : String(error),
          })
        })
    })
  }, [])

  const typeCounts = useMemo(() => countByType(pageState.reservations), [pageState.reservations])
  const categoryCounts = useMemo(
    () =>
      pageState.reservations.reduce<Record<Exclude<ReservationCategory, 'all'>, number>>(
        (counts, reservation) => {
          const key = reservationCategory(reservation)
          counts[key] += 1
          return counts
        },
        { transportation: 0, accommodation: 0, booking: 0 },
      ),
    [pageState.reservations],
  )
  const secondaryTypes = useMemo(
    () =>
      category === 'all'
        ? []
        : TYPE_OPTIONS.filter(
            (option) => typeCounts[option.value] && reservationCategory({ id: 0, type: option.value }) === category,
          ),
    [category, typeCounts],
  )
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    const inCategory =
      category === 'all'
        ? pageState.reservations
        : pageState.reservations.filter((reservation) => reservationCategory(reservation) === category)
    return filterAndSortReservations(inCategory, selectedTypes, statusFilter).filter(
      (reservation) => !query || reservationSearchText(reservation).includes(query),
    )
  }, [pageState.reservations, category, selectedTypes, statusFilter, search])

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

  const openNewReservation = () => {
    setEditingReservation(null)
    setEditorSession((session) => session + 1)
    setDialogOpen(true)
  }
  const openEditReservation = (reservation: Reservation) => {
    setEditingReservation(reservation)
    setEditorSession((session) => session + 1)
    setDialogOpen(true)
  }
  const applySavedReservation = (saved: Reservation) => {
    setPageState((current) => {
      const exists = current.reservations.some((reservation) => reservation.id === saved.id)
      return {
        ...current,
        reservations: exists
          ? current.reservations.map((reservation) =>
              reservation.id === saved.id ? { ...reservation, ...saved } : reservation,
            )
          : [...current.reservations, saved],
      }
    })
  }
  const deleteReservation = async (reservation: Reservation) => {
    if (!pageState.tripId) return
    const confirmed = await window.trek.confirm({
      title: 'Delete reservation',
      message: `Delete “${reservationTitle(reservation)}”? This cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      danger: true,
    })
    if (!confirmed) return
    try {
      await window.trek.invoke('/reservations', {
        method: 'DELETE',
        body: { tripId: pageState.tripId, reservationId: reservation.id },
      })
      setPageState((current) => ({
        ...current,
        reservations: current.reservations.filter((currentReservation) => currentReservation.id !== reservation.id),
      }))
      window.trek.notify('success', 'Reservation deleted')
    } catch (error) {
      window.trek.notify('error', error instanceof Error ? error.message : 'Unable to delete reservation')
    }
  }

  const createCost = async (reservation: Reservation) => {
    if (!pageState.tripId) return
    const category =
      reservation.type === 'flight'
        ? 'flights'
        : reservation.type === 'hotel'
          ? 'accommodation'
          : reservation.type === 'restaurant'
            ? 'food'
            : ['train', 'bus', 'car', 'taxi', 'bicycle', 'cruise', 'ferry', 'transport_other', 'transit'].includes(
                  reservation.type || '',
                )
              ? 'transport'
              : ['event', 'tour'].includes(reservation.type || '')
                ? 'activities'
                : 'other'
    try {
      const result = await window.trek.invoke<{ cost: Cost }>('/costs/save', {
        method: 'POST',
        body: {
          tripId: pageState.tripId,
          input: {
            name: reservation.title || 'Reservation',
            total_price: 0,
            currency: pageState.trip?.currency || 'EUR',
            category,
            reservation_id: reservation.id,
          },
        },
      })
      setPageState((current) => ({ ...current, costs: [...current.costs, result.cost] }))
      window.trek.notify('success', 'Linked cost created')
    } catch (error) {
      window.trek.notify('error', error instanceof Error ? error.message : 'Unable to create linked cost')
    }
  }
  const openCost = () => {
    window.trek.notify('info', 'Open the Costs tab to edit this linked cost.')
  }
  const deleteCost = async (cost: Cost) => {
    if (!pageState.tripId) return
    const confirmed = await window.trek.confirm({
      title: 'Remove expense',
      message: `Remove “${cost.name || 'this expense'}” from this reservation?`,
      confirmLabel: 'Remove',
      cancelLabel: 'Cancel',
      danger: true,
    })
    if (!confirmed) return
    try {
      await window.trek.invoke('/costs', { method: 'DELETE', body: { tripId: pageState.tripId, costId: cost.id } })
      setPageState((current) => ({ ...current, costs: current.costs.filter((item) => item.id !== cost.id) }))
      window.trek.notify('success', 'Expense removed')
    } catch (error) {
      window.trek.notify('error', error instanceof Error ? error.message : 'Unable to remove expense')
    }
  }

  const hasActiveFilters = search.trim() || selectedTypes.size > 0 || statusFilter !== 'all'

  return (
    <main className="h-full min-h-0 overflow-y-auto overscroll-contain px-5 pt-3.5 pb-[72px] max-[720px]:p-4">
      <ReservationHeader
        reservationCount={pageState.reservations.length}
        filteredCount={filtered.length}
        category={category}
        categoryCounts={categoryCounts}
        viewMode={viewMode}
        search={search}
        secondaryTypes={secondaryTypes}
        selectedTypes={selectedTypes}
        typeCounts={typeCounts}
        statusFilter={statusFilter}
        hasActiveFilters={Boolean(hasActiveFilters)}
        onCategoryChange={selectCategory}
        onViewModeChange={setViewMode}
        onSearchChange={setSearch}
        onTypeToggle={toggleType}
        onStatusChange={setStatusFilter}
        onClearFilters={clearFilters}
        onAddReservation={openNewReservation}
      />

      {pageState.loading ? (
        <div className="trek-card px-5 py-14 text-center [&_h2]:mb-1.5 [&_h2]:text-[15px] [&_p]:mx-auto [&_p]:max-w-[520px] [&_p]:text-[13px] [&_p]:leading-[1.45] [&_p]:text-content-muted">
          <h2>Loading</h2>
          <p>Reading reservations for this trip.</p>
        </div>
      ) : pageState.error ? (
        <div className="trek-card px-5 py-14 text-center [&_h2]:mb-1.5 [&_h2]:text-[15px] [&_p]:mx-auto [&_p]:max-w-[520px] [&_p]:text-[13px] [&_p]:leading-[1.45] [&_p]:text-content-muted">
          <h2 className="text-danger">Unable to load reservations</h2>
          <p>{pageState.error}</p>
        </div>
      ) : pageState.reservations.length === 0 ? (
        <div className="trek-card px-5 py-14 text-center [&_h2]:mb-1.5 [&_h2]:text-[15px] [&_p]:mx-auto [&_p]:max-w-[520px] [&_p]:text-[13px] [&_p]:leading-[1.45] [&_p]:text-content-muted">
          <h2>No reservations yet</h2>
          <p>Add transportation or booking reservations in the TREK planner and they will appear here.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="trek-card px-5 py-14 text-center [&_h2]:mb-1.5 [&_h2]:text-[15px] [&_p]:mx-auto [&_p]:max-w-[520px] [&_p]:text-[13px] [&_p]:leading-[1.45] [&_p]:text-content-muted">
          <h2>No reservations found</h2>
          <p>Adjust the filters or search.</p>
        </div>
      ) : viewMode === 'table' ? (
        <ReservationTableView
          reservations={filtered}
          visibleColumns={defaultTableColumns}
          onEdit={openEditReservation}
          onDelete={deleteReservation}
        />
      ) : viewMode === 'calendar' ? (
        <ReservationCalendarView reservations={filtered} trip={pageState.trip} onEdit={openEditReservation} />
      ) : (
        <ReservationCardView
          reservations={filtered}
          trip={pageState.trip}
          days={pageState.days}
          accommodations={pageState.accommodations}
          onEdit={openEditReservation}
          onDelete={deleteReservation}
        />
      )}
      <ReservationEditor
        key={editorSession}
        open={dialogOpen}
        tripId={pageState.tripId}
        reservation={editingReservation}
        startingCategory={
          editingReservation
            ? undefined
            : ((category === 'transportation' ? 'transit' : category === 'all' ? undefined : category) as
                ReservationTypeCategory | undefined)
        }
        days={pageState.days}
        places={pageState.places}
        accommodations={pageState.accommodations}
        files={pageState.files}
        costs={pageState.costs}
        onClose={() => setDialogOpen(false)}
        onSaved={applySavedReservation}
        onCreateCost={createCost}
        onOpenCost={openCost}
        onRemoveCost={deleteCost}
      />
    </main>
  )
}
