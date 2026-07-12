import { useEffect, useState } from 'react'
import type { ReservationFormProps } from '../types'
import { Field, inputClass } from '../FormFields'
import { PlaceInputSearch } from '../PlaceInputSearch'
import { TripDaySelect } from '../TripDaySelect'
import { TimePicker } from '../TimePicker'

function dayLabel(day: { title?: string | null; day_number?: number; date?: string | null }) {
  return day.title || `Day ${day.day_number || ''}`.trim()
}

function dayBadge(day: { date?: string | null }) {
  return day.date
    ? new Date(`${day.date}T00:00:00Z`).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      })
    : undefined
}

export function AccommodationForm({
  tripId,
  type,
  reservation,
  days,
  places,
  accommodations,
  onDraftChange,
}: ReservationFormProps) {
  const [draft, setDraft] = useState({
    title: '',
    placeId: '',
    startDay: '',
    endDay: '',
    address: '',
    code: '',
    status: 'pending',
    checkIn: '',
    checkInUntil: '',
    checkOut: '',
    url: '',
    notes: '',
  })
  useEffect(() => {
    const acc = reservation?.accommodation_id
      ? accommodations.find((item) => item.id === reservation.accommodation_id)
      : undefined
    const meta = typeof reservation?.metadata === 'object' && reservation.metadata ? reservation.metadata : {}
    setDraft({
      title: reservation?.title || '',
      placeId: acc?.place_id ? String(acc.place_id) : '',
      startDay: acc?.start_day_id ? String(acc.start_day_id) : '',
      endDay: acc?.end_day_id ? String(acc.end_day_id) : '',
      address: reservation?.location || '',
      code: reservation?.confirmation_number || '',
      status: reservation?.status || 'pending',
      checkIn: acc?.check_in || (typeof meta.check_in_time === 'string' ? meta.check_in_time : ''),
      checkInUntil: acc?.check_in_end || (typeof meta.check_in_end_time === 'string' ? meta.check_in_end_time : ''),
      checkOut: acc?.check_out || (typeof meta.check_out_time === 'string' ? meta.check_out_time : ''),
      url: reservation?.url || reservation?.booking_url || '',
      notes: reservation?.notes || '',
    })
  }, [reservation, accommodations])
  const set = (key: keyof typeof draft, value: string) => setDraft((current) => ({ ...current, [key]: value }))
  useEffect(() => {
    const existing = reservation?.accommodation_id
      ? accommodations.find((item) => item.id === reservation.accommodation_id)
      : undefined
    onDraftChange?.({
      title: draft.title,
      input: {
        type,
        title: draft.title,
        status: draft.status,
        location: draft.address,
        confirmation_number: draft.code,
        url: draft.url,
        notes: draft.notes,
        reservation_time: null,
        reservation_end_time: null,
        metadata:
          draft.checkIn || draft.checkInUntil || draft.checkOut
            ? {
                check_in_time: draft.checkIn || null,
                check_in_end_time: draft.checkInUntil || null,
                check_out_time: draft.checkOut || null,
              }
            : null,
        endpoints: [],
      },
      accommodation: {
        id: existing?.id,
        place_id: draft.placeId ? Number(draft.placeId) : null,
        start_day_id: draft.startDay ? Number(draft.startDay) : null,
        end_day_id: draft.endDay ? Number(draft.endDay) : null,
        check_in: draft.checkIn || null,
        check_in_end: draft.checkInUntil || null,
        check_out: draft.checkOut || null,
        confirmation: draft.code || null,
        venue: draft.placeId ? null : { name: draft.title, address: draft.address || null },
      },
    })
  }, [accommodations, draft, onDraftChange, reservation?.accommodation_id, type])
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Accommodation place">
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
        <Field label="From trip day">
          <TripDaySelect
            value={draft.startDay}
            onChange={(value) =>
              setDraft((current) => ({
                ...current,
                startDay: value,
                endDay:
                  days.findIndex((day) => String(day.id) === value) >
                  days.findIndex((day) => String(day.id) === current.endDay)
                    ? value
                    : current.endDay,
              }))
            }
            options={days.map((day) => ({ value: String(day.id), label: dayLabel(day), badge: dayBadge(day) }))}
          />
        </Field>
        <Field label="To trip day">
          <TripDaySelect
            value={draft.endDay}
            onChange={(value) =>
              setDraft((current) => ({
                ...current,
                startDay:
                  days.findIndex((day) => String(day.id) === value) <
                  days.findIndex((day) => String(day.id) === current.startDay)
                    ? value
                    : current.startDay,
                endDay: value,
              }))
            }
            options={days.map((day) => ({ value: String(day.id), label: dayLabel(day), badge: dayBadge(day) }))}
          />
        </Field>
      </div>
      <Field label="Location / address">
        <PlaceInputSearch
          tripId={tripId}
          searchType="world-place"
          value={draft.address}
          placeholder="Address, Airport, Hotel..."
          onChange={(value) => set('address', value)}
        />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Check-in">
          <TimePicker value={draft.checkIn} onChange={(value) => set('checkIn', value)} />
        </Field>
        <Field label="Check-in until">
          <TimePicker value={draft.checkInUntil} onChange={(value) => set('checkInUntil', value)} />
        </Field>
        <Field label="Check-out">
          <TimePicker value={draft.checkOut} onChange={(value) => set('checkOut', value)} />
        </Field>
      </div>
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
        <input
          className={inputClass}
          type="url"
          value={draft.url}
          onChange={(event) => set('url', event.target.value)}
          placeholder="https://..."
        />
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
