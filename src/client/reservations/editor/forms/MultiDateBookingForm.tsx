import { useEffect, useState } from 'react'
import { Link2 } from 'lucide-react'
import type { ReservationFormProps } from '../types'
import { Field, inputClass } from '../FormFields'

export function MultiDateBookingForm({ reservation, places, files }: ReservationFormProps) {
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
          placeholder="Reservation title"
        />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Date">
          <input
            className={inputClass}
            type="date"
            value={draft.startDate}
            onChange={(event) => set('startDate', event.target.value)}
          />
        </Field>
        <Field label="Start time">
          <input
            className={inputClass}
            type="time"
            value={draft.startTime}
            onChange={(event) => set('startTime', event.target.value)}
          />
        </Field>
        <Field label="End date">
          <input
            className={inputClass}
            type="date"
            value={draft.endDate}
            onChange={(event) => set('endDate', event.target.value)}
          />
        </Field>
        <Field label="End time">
          <input
            className={inputClass}
            type="time"
            value={draft.endTime}
            onChange={(event) => set('endTime', event.target.value)}
          />
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
        <input
          className={inputClass}
          value={draft.location}
          onChange={(event) => set('location', event.target.value)}
        />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Confirmation code">
          <input className={inputClass} value={draft.code} onChange={(event) => set('code', event.target.value)} />
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
            placeholder="https://"
          />
        </div>
      </Field>
      <Field label="Notes">
        <textarea
          className={inputClass}
          rows={2}
          value={draft.notes}
          onChange={(event) => set('notes', event.target.value)}
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
