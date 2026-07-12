import { useEffect, useState } from 'react'
import type { ReservationFormProps } from '../types'
import { Field, inputClass } from '../FormFields'
import { PlaceInputSearch, type PlaceInputSearchResult } from '../PlaceInputSearch'
import { reservationRoute } from '../../model'

export function PointToPointTransportForm({
  tripId,
  type,
  reservation,
  days,
  places,
  onDraftChange,
}: ReservationFormProps) {
  const [draft, setDraft] = useState({
    title: '',
    from: '',
    fromLat: null as number | null,
    fromLng: null as number | null,
    to: '',
    toLat: null as number | null,
    toLng: null as number | null,
    startDayId: '',
    startTime: '',
    endDayId: '',
    endTime: '',
    code: '',
    status: 'pending',
    notes: '',
  })
  useEffect(() => {
    const route = reservation ? reservationRoute(reservation) : []
    const endpoints = reservation?.endpoints || []
    const fromEndpoint = endpoints.find((endpoint) => endpoint.role === 'from')
    const toEndpoint = endpoints.find((endpoint) => endpoint.role === 'to')
    const coordinate = (endpoint: typeof fromEndpoint, key: 'lat' | 'lng') => {
      const value = Number(endpoint?.[key])
      return Number.isFinite(value) ? value : null
    }
    const [, startTime = ''] = (reservation?.reservation_time || '').split(/[T ]/)
    const [, endTime = ''] = (reservation?.reservation_end_time || '').split(/[T ]/)
    setDraft({
      title: reservation?.title || '',
      from: route[0] || '',
      fromLat: coordinate(fromEndpoint, 'lat'),
      fromLng: coordinate(fromEndpoint, 'lng'),
      to: route.at(-1) || '',
      toLat: coordinate(toEndpoint, 'lat'),
      toLng: coordinate(toEndpoint, 'lng'),
      startDayId: reservation?.day_id ? String(reservation.day_id) : '',
      startTime: startTime.slice(0, 5),
      endDayId: reservation?.end_day_id ? String(reservation.end_day_id) : '',
      endTime: endTime.slice(0, 5),
      code: reservation?.confirmation_number || '',
      status: reservation?.status || 'pending',
      notes: reservation?.notes || '',
    })
  }, [reservation])
  const set = (key: keyof typeof draft, value: string) => setDraft((current) => ({ ...current, [key]: value }))
  useEffect(() => {
    const dateTime = (dayId: string, time: string) => {
      const date = days.find((day) => String(day.id) === dayId)?.date
      return date ? `${date}${time ? `T${time}` : ''}` : null
    }
    onDraftChange?.({
      title: draft.title,
      input: {
        type,
        title: draft.title,
        status: draft.status,
        confirmation_number: draft.code,
        notes: draft.notes,
        day_id: draft.startDayId ? Number(draft.startDayId) : null,
        end_day_id: draft.endDayId ? Number(draft.endDayId) : null,
        reservation_time: dateTime(draft.startDayId, draft.startTime),
        reservation_end_time: dateTime(draft.endDayId || draft.startDayId, draft.endTime),
        endpoints: [
          draft.from && {
            role: 'from',
            sequence: 0,
            name: draft.from,
            lat: draft.fromLat,
            lng: draft.fromLng,
            local_date: days.find((day) => String(day.id) === draft.startDayId)?.date || null,
            local_time: draft.startTime || null,
          },
          draft.to && {
            role: 'to',
            sequence: 1,
            name: draft.to,
            lat: draft.toLat,
            lng: draft.toLng,
            local_date: days.find((day) => String(day.id) === (draft.endDayId || draft.startDayId))?.date || null,
            local_time: draft.endTime || null,
          },
        ].filter(Boolean),
      },
    })
  }, [days, draft, onDraftChange, type])
  const dayOptions = days.map((day) => ({
    value: String(day.id),
    label: `${day.title || `Day ${day.day_number || ''}`}${day.date ? ` · ${day.date}` : ''}`,
  }))
  const pickEndpoint = (role: 'from' | 'to', place: PlaceInputSearchResult) => {
    const name = place.name || place.address
    if (!name) return
    if (role === 'from') {
      setDraft((current) => ({ ...current, from: name, fromLat: place.lat ?? null, fromLng: place.lng ?? null }))
    } else {
      setDraft((current) => ({ ...current, to: name, toLat: place.lat ?? null, toLng: place.lng ?? null }))
    }
  }
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
        <Field label="From">
          <PlaceInputSearch
            tripId={tripId}
            places={places}
            selectedValue="name"
            value={draft.from}
            placeholder="Search station, port, address…"
            selected={draft.fromLat !== null && draft.fromLng !== null}
            onClear={() => setDraft((current) => ({ ...current, fromLat: null, fromLng: null }))}
            onChange={(value) => setDraft((current) => ({ ...current, from: value, fromLat: null, fromLng: null }))}
            onPick={(place) => pickEndpoint('from', place)}
          />
        </Field>
        <Field label="To">
          <PlaceInputSearch
            tripId={tripId}
            places={places}
            selectedValue="name"
            value={draft.to}
            placeholder="Search station, port, address…"
            selected={draft.toLat !== null && draft.toLng !== null}
            onClear={() => setDraft((current) => ({ ...current, toLat: null, toLng: null }))}
            onChange={(value) => setDraft((current) => ({ ...current, to: value, toLat: null, toLng: null }))}
            onPick={(place) => pickEndpoint('to', place)}
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={type === 'car' ? 'Pickup day' : 'Day'}>
          <select
            data-trek-native
            className={inputClass}
            value={draft.startDayId}
            onChange={(event) => set('startDayId', event.target.value)}
          >
            <option value="">Select day</option>
            {dayOptions.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Start time">
          <input
            className={inputClass}
            type="time"
            value={draft.startTime}
            onChange={(event) => set('startTime', event.target.value)}
          />
        </Field>
        <Field label={type === 'car' ? 'Return day' : 'End day'}>
          <select
            data-trek-native
            className={inputClass}
            value={draft.endDayId}
            onChange={(event) => set('endDayId', event.target.value)}
          >
            <option value="">Select day</option>
            {dayOptions.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
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
