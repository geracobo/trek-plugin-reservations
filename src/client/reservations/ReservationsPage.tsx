import { useEffect, useState } from 'react'
import type { Accommodation, Cost, Day, Place, ReservationFile, ReservationsResponse, Reservation, Trip } from './types'
import { reservationTitle } from './model'
import { ReservationCardView } from './cards/ReservationCardView'
import { ReservationCalendarView } from './calendar/ReservationCalendarView'
import { ReservationTableView } from './table/ReservationTableView'
import { ReservationBrowseToolbar } from './browse/ReservationBrowseToolbar'
import { useReservationBrowse } from './browse/useReservationBrowse'
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

function updateReservationFiles(
  reservations: Reservation[],
  reservationId: number,
  update: (files: ReservationFile[]) => ReservationFile[],
) {
  return reservations.map((item) => (item.id === reservationId ? { ...item, files: update(item.files || []) } : item))
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

  const browse = useReservationBrowse({
    reservations: pageState.reservations,
    days: pageState.days,
    accommodations: pageState.accommodations,
  })

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

    const tripId = pageState.tripId
    if (!tripId) return
    // Hotel saves can create or update a separate lodging block. Reload the
    // surface so the card has the current accommodation/day linkage straight
    // away, rather than waiting for the plugin to be reopened.
    void window.trek
      .invoke<ReservationsResponse>(`/reservations?tripId=${encodeURIComponent(tripId)}`)
      .then((data) => {
        setPageState((current) => {
          if (current.tripId !== tripId) return current
          return {
            ...current,
            trip: data.trip,
            reservations: Array.isArray(data.reservations) ? data.reservations : [],
            places: Array.isArray(data.places) ? data.places : [],
            days: Array.isArray(data.days) ? data.days : [],
            accommodations: Array.isArray(data.accommodations) ? data.accommodations : [],
            files: Array.isArray(data.files) ? data.files : [],
            costs: Array.isArray(data.costs) ? data.costs : [],
          }
        })
      })
      .catch(() => {
        // The reservation itself already saved; retain the optimistic update
        // if this best-effort hydration request is unavailable.
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

  const fileToPayload = async (file: File) => {
    const content = await file.arrayBuffer()
    const bytes = new Uint8Array(content)
    let binary = ''
    for (let index = 0; index < bytes.length; index += 0x8000)
      binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
    return { name: file.name, mimetype: file.type || undefined, content_base64: btoa(binary) }
  }
  const uploadFile = async (reservation: Reservation, upload: File) => {
    if (!pageState.tripId) return
    try {
      const result = await window.trek.invoke<{ file: ReservationFile }>('/files/save', {
        method: 'POST',
        body: { tripId: pageState.tripId, reservationId: reservation.id, file: await fileToPayload(upload) },
      })
      setPageState((current) => ({
        ...current,
        files: [...current.files, result.file],
        reservations: updateReservationFiles(current.reservations, reservation.id, (files) => [...files, result.file]),
      }))
      window.trek.notify('success', 'File attached')
    } catch (error) {
      window.trek.notify('error', error instanceof Error ? error.message : 'Unable to attach file')
      throw error
    }
  }
  const linkFile = async (reservation: Reservation, file: ReservationFile) => {
    if (!pageState.tripId || file.id == null) return
    try {
      const result = await window.trek.invoke<{ file: ReservationFile }>('/files/link', {
        method: 'POST',
        body: { tripId: pageState.tripId, reservationId: reservation.id, fileId: file.id },
      })
      setPageState((current) => ({
        ...current,
        files: current.files.map((item) => (item.id === file.id ? result.file : item)),
        reservations: updateReservationFiles(current.reservations, reservation.id, (files) => [
          ...files.filter((item) => item.id !== file.id),
          result.file,
        ]),
      }))
      window.trek.notify('success', 'File linked')
    } catch (error) {
      window.trek.notify('error', error instanceof Error ? error.message : 'Unable to link file')
      throw error
    }
  }
  const removeFile = async (reservation: Reservation, file: ReservationFile) => {
    if (!pageState.tripId || file.id == null) return
    const confirmed = await window.trek.confirm({
      title: 'Detach file',
      message: `Detach “${file.original_name || file.filename || file.name || 'this file'}” from this reservation?`,
      confirmLabel: 'Detach',
      cancelLabel: 'Cancel',
      danger: true,
    })
    if (!confirmed) return
    try {
      await window.trek.invoke('/files/link', {
        method: 'DELETE',
        body: { tripId: pageState.tripId, reservationId: reservation.id, fileId: file.id },
      })
      setPageState((current) => ({
        ...current,
        files: current.files.map((item) => (item.id === file.id ? { ...item, reservation_id: null } : item)),
        reservations: updateReservationFiles(current.reservations, reservation.id, (files) =>
          files.filter((item) => item.id !== file.id),
        ),
      }))
      window.trek.notify('success', 'File detached')
    } catch (error) {
      window.trek.notify('error', error instanceof Error ? error.message : 'Unable to detach file')
      throw error
    }
  }

  return (
    <main className="h-full min-h-0 overflow-y-auto overscroll-contain px-5 pt-3.5 pb-[72px] max-[720px]:p-4">
      <ReservationBrowseToolbar
        reservationCount={pageState.reservations.length}
        filteredCount={browse.filteredReservations.length}
        category={browse.category}
        categoryCounts={browse.categoryCounts}
        viewMode={browse.viewMode}
        search={browse.search}
        secondaryTypes={browse.secondaryTypes}
        selectedTypes={browse.selectedTypes}
        typeCounts={browse.typeCounts}
        statusFilter={browse.statusFilter}
        sortKey={browse.sortKey}
        sortDirection={browse.sortDirection}
        groupBy={browse.groupBy}
        visibleColumns={browse.visibleColumns}
        visibleCardFields={browse.visibleCardFields}
        hasActiveFilters={browse.hasActiveFilters}
        onCategoryChange={browse.selectCategory}
        onViewModeChange={browse.setViewMode}
        onSearchChange={browse.setSearch}
        onTypeToggle={browse.toggleType}
        onStatusChange={browse.setStatusFilter}
        onSortChange={browse.setSort}
        onGroupChange={browse.setGroupBy}
        onColumnToggle={browse.toggleColumn}
        onCardFieldToggle={browse.toggleCardField}
        onClearFilters={browse.clearFilters}
        onResetView={browse.resetView}
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
      ) : browse.filteredReservations.length === 0 ? (
        <div className="trek-card px-5 py-14 text-center [&_h2]:mb-1.5 [&_h2]:text-[15px] [&_p]:mx-auto [&_p]:max-w-[520px] [&_p]:text-[13px] [&_p]:leading-[1.45] [&_p]:text-content-muted">
          <h2>No reservations found</h2>
          <p>Adjust the filters or search.</p>
        </div>
      ) : browse.viewMode === 'table' ? (
        <ReservationTableView
          reservations={browse.filteredReservations}
          visibleColumns={browse.visibleColumns}
          groupBy={browse.groupBy}
          onEdit={openEditReservation}
          onDelete={deleteReservation}
        />
      ) : browse.viewMode === 'calendar' ? (
        <ReservationCalendarView
          reservations={browse.filteredReservations}
          trip={pageState.trip}
          onEdit={openEditReservation}
        />
      ) : (
        <ReservationCardView
          reservations={browse.filteredReservations}
          trip={pageState.trip}
          days={pageState.days}
          accommodations={pageState.accommodations}
          groupBy={browse.groupBy}
          visibleFields={browse.visibleCardFields}
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
            : ((browse.category === 'transportation'
                ? 'transit'
                : browse.category === 'all'
                  ? undefined
                  : browse.category) as ReservationTypeCategory | undefined)
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
        onUploadFile={uploadFile}
        onLinkFile={linkFile}
        onRemoveFile={removeFile}
      />
    </main>
  )
}
