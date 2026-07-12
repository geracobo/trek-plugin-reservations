import { useEffect, useState } from 'react'
import { Link2 } from 'lucide-react'
import type { ReservationFormProps } from '../types'
import { Field, inputClass } from '../FormFields'
import { PlaceInputSearch } from '../PlaceInputSearch'
import { DatePicker } from '../DatePicker'
import { TimePicker } from '../TimePicker'
import { BookingAssignmentSelect } from '../BookingAssignmentSelect'

export function SingleDateBookingForm({
  tripId,
  type,
  reservation,
  days,
  places,
  onDraftChange,
}: ReservationFormProps) {
  const [draft, setDraft] = useState({
    title: '',
    date: '',
    time: '',
    assignmentId: '',
    placeId: '',
    location: '',
    code: '',
    status: 'pending',
    url: '',
    notes: '',
  })
  useEffect(() => {
    const [date = '', time = ''] = (reservation?.reservation_time || '').split(/[T ]/)
    setDraft({
      title: reservation?.title || '',
      date,
      time: time.slice(0, 5),
      assignmentId: reservation?.assignment_id ? String(reservation.assignment_id) : '',
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
    onDraftChange?.({
      title: draft.title,
      input: {
        type,
        title: draft.title,
        status: draft.status,
        assignment_id: draft.assignmentId ? Number(draft.assignmentId) : null,
        place_id: draft.placeId || null,
        location: draft.location,
        confirmation_number: draft.code,
        url: draft.url,
        notes: draft.notes,
        reservation_time: draft.date ? `${draft.date}${draft.time ? `T${draft.time}` : ''}` : null,
        reservation_end_time: null,
        endpoints: [],
      },
    })
  }, [draft, onDraftChange, type])
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
      <BookingAssignmentSelect
        days={days}
        value={draft.assignmentId}
        onChange={(assignmentId, dayDate) =>
          setDraft((current) => ({ ...current, assignmentId, date: current.date || dayDate || '' }))
        }
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Date">
          <DatePicker value={draft.date} onChange={(value) => set('date', value)} />
        </Field>
        <Field label="Time">
          <TimePicker
            value={draft.time}
            onChange={(value) =>
              setDraft((current) => ({
                ...current,
                time: value,
                date: current.date || new Date().toISOString().slice(0, 10),
              }))
            }
          />
        </Field>
      </div>
      <Field label="Place / Activity">
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
    </div>
  )
}
