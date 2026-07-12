import { useEffect, useState } from 'react'
import { Link2 } from 'lucide-react'
import type { ReservationFormProps } from '../types'
import { Field, inputClass } from '../FormFields'
import { PlaceInputSearch } from '../PlaceInputSearch'
import { DatePicker } from '../DatePicker'
import { TimePicker } from '../TimePicker'

export function MultiDateBookingForm({
  tripId,
  type,
  reservation,
  places,
  files,
  onDraftChange,
}: ReservationFormProps) {
  const [draft, setDraft] = useState({
    title: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    placeId: '',
    location: '',
    code: '',
    status: 'pending',
    url: '',
    notes: '',
  })
  useEffect(() => {
    const [startDate = '', startTime = ''] = (reservation?.reservation_time || '').split(/[T ]/)
    const [endDate = '', endTime = ''] = (reservation?.reservation_end_time || '').split(/[T ]/)
    setDraft({
      title: reservation?.title || '',
      startDate,
      startTime: startTime.slice(0, 5),
      endDate,
      endTime: endTime.slice(0, 5),
      placeId: reservation?.place_id ? String(reservation.place_id) : '',
      location: reservation?.location || '',
      code: reservation?.confirmation_number || '',
      status: reservation?.status || 'pending',
      url: reservation?.url || reservation?.booking_url || '',
      notes: reservation?.notes || '',
    })
  }, [reservation])
  const set = (key: keyof typeof draft, value: string) => setDraft((current) => ({ ...current, [key]: value }))
  useEffect(() => {
    const dateTime = (date: string, time: string) => (date ? `${date}${time ? `T${time}` : ''}` : null)
    onDraftChange?.({
      title: draft.title,
      input: {
        type,
        title: draft.title,
        status: draft.status,
        place_id: draft.placeId || null,
        location: draft.location,
        confirmation_number: draft.code,
        url: draft.url,
        notes: draft.notes,
        reservation_time: dateTime(draft.startDate, draft.startTime),
        reservation_end_time: dateTime(draft.endDate, draft.endTime),
        endpoints: [],
      },
    })
  }, [draft, onDraftChange, type])
  const attached = reservation
    ? files.filter(
        (file) => file.reservation_id === reservation.id || file.linked_reservation_ids?.includes(reservation.id),
      )
    : []
  return (
    <div className="flex flex-col gap-3.5">
      <Field label="Title *">
        <input
          className={inputClass}
          required
          value={draft.title}
          onChange={(event) => set('title', event.target.value)}
          placeholder="e.g. Lufthansa LH123, Hotel Adlon, ..."
        />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Date">
          <DatePicker value={draft.startDate} onChange={(value) => set('startDate', value)} />
        </Field>
        <Field label="Start time">
          <TimePicker value={draft.startTime} onChange={(value) => set('startTime', value)} />
        </Field>
        <Field label="End date">
          <DatePicker value={draft.endDate} onChange={(value) => set('endDate', value)} />
        </Field>
        <Field label="End time">
          <TimePicker value={draft.endTime} onChange={(value) => set('endTime', value)} />
        </Field>
      </div>
      <Field label="Link place">
        <select
          data-trek-native
          className={inputClass}
          value={draft.placeId}
          onChange={(event) => set('placeId', event.target.value)}
        >
          <option value="">—</option>
          {places.map((place) => (
            <option key={place.id} value={place.id}>
              {place.name || `Place ${place.id}`}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Location / address">
        <PlaceInputSearch
          tripId={tripId}
          searchType="world-place"
          value={draft.location}
          placeholder="Address, Airport, Hotel..."
          onChange={(value) => set('location', value)}
        />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Confirmation code">
          <input
            className={inputClass}
            value={draft.code}
            onChange={(event) => set('code', event.target.value)}
            placeholder="e.g. ABC12345"
          />
        </Field>
        <Field label="Status">
          <select
            data-trek-native
            className={inputClass}
            value={draft.status}
            onChange={(event) => set('status', event.target.value)}
          >
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
          </select>
        </Field>
      </div>
      <Field label="Link">
        <div className="relative">
          <Link2
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-content-muted"
            size={15}
          />
          <input
            className={inputClass}
            style={{ paddingLeft: 34 }}
            type="url"
            value={draft.url}
            onChange={(event) => set('url', event.target.value)}
            placeholder="https://..."
          />
        </div>
      </Field>
      <Field label="Notes">
        <textarea
          className={inputClass}
          rows={2}
          value={draft.notes}
          onChange={(event) => set('notes', event.target.value)}
          placeholder="Additional notes..."
        />
      </Field>
      <Field label="Files">
        <div className="flex flex-col gap-1.5">
          {attached.map((file) => (
            <div key={file.id} className="rounded-lg bg-surface-secondary px-2.5 py-1.5 text-xs text-content-muted">
              {file.original_name || file.filename || 'Unnamed file'}
            </div>
          ))}
          <span className="text-xs text-content-faint">
            File changes will be available when upload/link actions are connected.
          </span>
        </div>
      </Field>
    </div>
  )
}
