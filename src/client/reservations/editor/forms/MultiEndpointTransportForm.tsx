import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ReservationFormProps } from '../editor-types'
import { Field, inputClass, labelClass } from '../fields/FormFields'
import { normalizeMetadata } from '../../model'
import { PlaceInputSearch, type PlaceInputSearchResult } from '../fields/PlaceInputSearch'
import { TripDaySelect } from '../fields/TripDaySelect'
import { TimePicker } from '../fields/TimePicker'

interface Waypoint {
  name: string
  code: string | null
  timezone: string | null
  lat: number | null
  lng: number | null
  arrivalDayId: string
  arrivalTime: string
  departureDayId: string
  departureTime: string
  carrier: string
  number: string
  platform: string
  seat: string
}

const emptyWaypoint = (dayId = ''): Waypoint => ({
  name: '',
  code: null,
  timezone: null,
  lat: null,
  lng: null,
  arrivalDayId: dayId,
  arrivalTime: '',
  departureDayId: dayId,
  departureTime: '',
  carrier: '',
  number: '',
  platform: '',
  seat: '',
})

function splitDateTime(value: string | null | undefined) {
  const [date = '', time = ''] = (value || '').split(/[T ]/)
  return { date, time: time.slice(0, 5) }
}

export function MultiEndpointTransportForm({ tripId, type, reservation, days, onDraftChange }: ReservationFormProps) {
  const isFlight = type === 'flight'
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState('pending')
  const [confirmationNumber, setConfirmationNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [waypoints, setWaypoints] = useState<Waypoint[]>([emptyWaypoint(), emptyWaypoint()])

  useEffect(() => {
    const endpoints = reservation?.endpoints || []
    const meta = reservation ? normalizeMetadata(reservation) : {}
    const legs = Array.isArray(meta.legs) ? meta.legs : []
    const start = splitDateTime(reservation?.reservation_time)
    const end = splitDateTime(reservation?.reservation_end_time)
    const savedWaypoints =
      endpoints.length >= 2
        ? endpoints
            .slice()
            .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
            .map((endpoint, index) => {
              const incoming = legs[index - 1] as Record<string, unknown> | undefined
              const outgoing = legs[index] as Record<string, unknown> | undefined
              return {
                ...emptyWaypoint(),
                name: endpoint.name || '',
                code: typeof endpoint.code === 'string' ? endpoint.code : null,
                timezone: typeof endpoint.timezone === 'string' ? endpoint.timezone : null,
                lat: Number.isFinite(Number(endpoint.lat)) ? Number(endpoint.lat) : null,
                lng: Number.isFinite(Number(endpoint.lng)) ? Number(endpoint.lng) : null,
                arrivalDayId: String(
                  incoming?.arr_day_id || (index === endpoints.length - 1 ? reservation?.end_day_id || '' : ''),
                ),
                arrivalTime: String(incoming?.arr_time || (index === endpoints.length - 1 ? end.time : '')),
                departureDayId: String(outgoing?.dep_day_id || (index === 0 ? reservation?.day_id || '' : '')),
                departureTime: String(outgoing?.dep_time || (index === 0 ? start.time : '')),
                carrier: String(outgoing?.airline || ''),
                number: String(isFlight ? outgoing?.flight_number || '' : outgoing?.train_number || ''),
                platform: String(outgoing?.platform || ''),
                seat: String(outgoing?.seat || ''),
              }
            })
        : [
            emptyWaypoint(String(reservation?.day_id || '')),
            emptyWaypoint(String(reservation?.end_day_id || reservation?.day_id || '')),
          ]
    setTitle(reservation?.title || '')
    setStatus(reservation?.status || 'pending')
    setConfirmationNumber(reservation?.confirmation_number || '')
    setNotes(reservation?.notes || '')
    setWaypoints(savedWaypoints)
  }, [isFlight, reservation])

  useEffect(() => {
    const picked = waypoints.filter((waypoint) => waypoint.name.trim())
    const first = picked[0]
    const last = picked.at(-1)
    const dayDate = (id: string) => days.find((day) => String(day.id) === id)?.date || null
    // Match TREK's TransportModal: day linkage and a reservation timestamp are
    // separate. A selected day without an explicit time leaves these fields null.
    const dateTime = (dayId: string, time: string) => {
      if (!time) return null
      const date = dayDate(dayId)
      return date ? `${date}T${time}` : time
    }
    onDraftChange?.({
      title,
      input: {
        type,
        title,
        status,
        confirmation_number: confirmationNumber,
        notes,
        day_id: first?.departureDayId ? Number(first.departureDayId) : null,
        end_day_id: last?.arrivalDayId ? Number(last.arrivalDayId) : null,
        reservation_time: first ? dateTime(first.departureDayId, first.departureTime) : null,
        reservation_end_time: last ? dateTime(last.arrivalDayId, last.arrivalTime) : null,
        endpoints: picked.map((waypoint, sequence) => ({
          name: waypoint.name,
          code: waypoint.code,
          timezone: waypoint.timezone,
          role: sequence === 0 ? 'from' : sequence === picked.length - 1 ? 'to' : 'stop',
          sequence,
          lat: waypoint.lat,
          lng: waypoint.lng,
          local_date:
            days.find(
              (day) =>
                String(day.id) === (sequence === picked.length - 1 ? waypoint.arrivalDayId : waypoint.departureDayId),
            )?.date || null,
          local_time: sequence === picked.length - 1 ? waypoint.arrivalTime || null : waypoint.departureTime || null,
        })),
        metadata: {
          legs: picked.slice(0, -1).map((waypoint, index) => {
            const destination = picked[index + 1]
            return isFlight
              ? {
                  dep_day_id: waypoint.departureDayId || null,
                  dep_time: waypoint.departureTime || null,
                  arr_day_id: destination.arrivalDayId || null,
                  arr_time: destination.arrivalTime || null,
                  airline: waypoint.carrier || null,
                  flight_number: waypoint.number || null,
                  seat: waypoint.seat || null,
                }
              : {
                  dep_day_id: waypoint.departureDayId || null,
                  dep_time: waypoint.departureTime || null,
                  arr_day_id: destination.arrivalDayId || null,
                  arr_time: destination.arrivalTime || null,
                  train_number: waypoint.number || null,
                  platform: waypoint.platform || null,
                  seat: waypoint.seat || null,
                }
          }),
        },
      },
    })
  }, [confirmationNumber, days, isFlight, notes, onDraftChange, status, title, type, waypoints])

  const update = (index: number, patch: Partial<Waypoint>) =>
    setWaypoints((current) =>
      current.map((waypoint, currentIndex) => (currentIndex === index ? { ...waypoint, ...patch } : waypoint)),
    )
  const insertStop = (index: number) =>
    setWaypoints((current) => [
      ...current.slice(0, index + 1),
      emptyWaypoint(current[index]?.departureDayId),
      ...current.slice(index + 1),
    ])
  const pickWaypoint = (index: number, place: PlaceInputSearchResult) =>
    update(index, {
      name: isFlight ? `${place.city || place.name} (${place.iata || ''})` : place.name || place.address,
      code: place.iata || null,
      timezone: place.timezone || null,
      lat: place.lat ?? null,
      lng: place.lng ?? null,
    })
  const dayOptions = days.map((day) => ({
    value: String(day.id),
    label: day.title || `Day ${day.day_number || ''}`,
    badge: day.date
      ? new Date(`${day.date}T00:00:00Z`).toLocaleDateString(undefined, {
          day: 'numeric',
          month: 'short',
          timeZone: 'UTC',
        })
      : undefined,
  }))

  return (
    <div className="flex flex-col gap-3.5">
      <Field label="Title *">
        <input
          className={inputClass}
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Lufthansa LH123, Hotel Adlon, ..."
        />
      </Field>
      <div className="flex flex-col gap-2">
        <span className={labelClass}>Route</span>
        {waypoints.map((waypoint, index) => {
          const first = index === 0
          const last = index === waypoints.length - 1
          const role = first ? 'From' : last ? 'To' : 'Stop'
          return (
            <div key={index} className="flex flex-col gap-2">
              <div className="rounded-[10px] border border-edge bg-surface-card p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="w-10 text-[10px] font-bold uppercase tracking-[0.03em] text-content-faint">
                    {role}
                  </span>
                  <div className="min-w-0 flex-1">
                    <PlaceInputSearch
                      tripId={tripId}
                      searchType={isFlight ? 'airport' : 'world-place'}
                      debounceMs={isFlight ? 220 : undefined}
                      selectedValue="name"
                      value={waypoint.name}
                      placeholder={isFlight ? 'Airport code or city (e.g. FRA)' : 'Search station, port, address…'}
                      selected={waypoint.lat !== null && waypoint.lng !== null}
                      onClear={() => update(index, { code: null, timezone: null, lat: null, lng: null })}
                      onChange={(name) => update(index, { name, code: null, timezone: null, lat: null, lng: null })}
                      onPick={(place) => pickWaypoint(index, place)}
                    />
                  </div>
                  {!first && !last && (
                    <button
                      type="button"
                      onClick={() => setWaypoints((current) => current.filter((_, i) => i !== index))}
                      className="text-content-faint hover:text-danger"
                      aria-label="Remove stop"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
                {!first && (
                  <div
                    className={`grid grid-cols-1 gap-3 ${isFlight && waypoint.timezone ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}
                  >
                    <Field label="Arrival day">
                      <TripDaySelect
                        value={waypoint.arrivalDayId}
                        onChange={(value) => update(index, { arrivalDayId: value })}
                        options={dayOptions}
                      />
                    </Field>
                    <Field label="Arrival time">
                      <TimePicker
                        value={waypoint.arrivalTime}
                        onChange={(value) => update(index, { arrivalTime: value })}
                      />
                    </Field>
                    {isFlight && waypoint.timezone && (
                      <Field label="Arrival timezone">
                        <div className={`${inputClass} bg-surface-tertiary text-content-muted`}>
                          {waypoint.timezone}
                        </div>
                      </Field>
                    )}
                  </div>
                )}
                {!last && (
                  <>
                    <div
                      className={`mt-2 grid grid-cols-1 gap-3 ${isFlight && waypoint.timezone ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}
                    >
                      <Field label="Departure day">
                        <TripDaySelect
                          value={waypoint.departureDayId}
                          onChange={(value) => update(index, { departureDayId: value })}
                          options={dayOptions}
                        />
                      </Field>
                      <Field label="Departure time">
                        <TimePicker
                          value={waypoint.departureTime}
                          onChange={(value) => update(index, { departureTime: value })}
                        />
                      </Field>
                      {isFlight && waypoint.timezone && (
                        <Field label="Departure timezone">
                          <div className={`${inputClass} bg-surface-tertiary text-content-muted`}>
                            {waypoint.timezone}
                          </div>
                        </Field>
                      )}
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {isFlight && (
                        <Field label="Airline">
                          <input
                            className={inputClass}
                            value={waypoint.carrier}
                            onChange={(event) => update(index, { carrier: event.target.value })}
                            placeholder="Lufthansa"
                          />
                        </Field>
                      )}
                      <Field label={isFlight ? 'Flight number' : 'Train number'}>
                        <input
                          className={inputClass}
                          value={waypoint.number}
                          onChange={(event) => update(index, { number: event.target.value })}
                          placeholder={isFlight ? 'LH 123' : 'ICE 123'}
                        />
                      </Field>
                      {!isFlight && (
                        <Field label="Platform">
                          <input
                            className={inputClass}
                            value={waypoint.platform}
                            onChange={(event) => update(index, { platform: event.target.value })}
                            placeholder="12"
                          />
                        </Field>
                      )}
                      <Field label="Seat">
                        <input
                          className={inputClass}
                          value={waypoint.seat}
                          onChange={(event) => update(index, { seat: event.target.value })}
                          placeholder={isFlight ? '12A' : '42A'}
                        />
                      </Field>
                    </div>
                  </>
                )}
              </div>
              {!last && (
                <button
                  type="button"
                  onClick={() => insertStop(index)}
                  className="flex items-center justify-center gap-1 rounded-lg border border-dashed border-edge bg-transparent px-3 py-1.5 text-xs text-content-faint hover:text-content"
                >
                  <Plus size={13} /> Add stop
                </button>
              )}
            </div>
          )
        })}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Confirmation code">
          <input
            className={inputClass}
            value={confirmationNumber}
            onChange={(event) => setConfirmationNumber(event.target.value)}
            placeholder="e.g. ABC12345"
          />
        </Field>
        <Field label="Status">
          <select
            data-trek-native
            className={inputClass}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
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
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Additional notes..."
        />
      </Field>
    </div>
  )
}
