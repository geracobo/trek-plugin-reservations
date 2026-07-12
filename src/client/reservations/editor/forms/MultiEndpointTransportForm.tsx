import { useEffect, useState } from 'react'
import type { ReservationFormProps } from '../types'
import { Field, inputClass } from '../FormFields'
import { normalizeMetadata, reservationRoute } from '../../model'
import { PlaceInputSearch, type PlaceInputSearchResult } from '../PlaceInputSearch'

export function MultiLegTransportForm({ tripId, reservation, places }: ReservationFormProps) {
  const [draft, setDraft] = useState({
    title: '',
    date: '',
    startTime: '',
    endDate: '',
    endTime: '',
    route: '',
    carrier: '',
    number: '',
    seat: '',
    code: '',
    status: 'pending',
    notes: '',
  })
  const [stopSearch, setStopSearch] = useState('')
  useEffect(() => {
    const [date = '', startTime = ''] = (reservation?.reservation_time || '').split(/[T ]/)
    const [endDate = '', endTime = ''] = (reservation?.reservation_end_time || '').split(/[T ]/)
    const meta = reservation ? normalizeMetadata(reservation) : {}
    setDraft({
      title: reservation?.title || '',
      date,
      startTime: startTime.slice(0, 5),
      endDate,
      endTime: endTime.slice(0, 5),
      route: reservation ? reservationRoute(reservation).join('\n') : '',
      carrier: typeof meta.airline === 'string' ? meta.airline : '',
      number:
        typeof (meta.flight_number || meta.train_number) === 'string'
          ? String(meta.flight_number || meta.train_number)
          : '',
      seat: typeof meta.seat === 'string' ? meta.seat : '',
      code: reservation?.confirmation_number || '',
      status: reservation?.status || 'pending',
      notes: reservation?.notes || '',
    })
  }, [reservation])
  const set = (key: keyof typeof draft, value: string) => setDraft((current) => ({ ...current, [key]: value }))
  const addStop = (place: PlaceInputSearchResult) => {
    const stop = place.name || place.address
    if (!stop) return
    set('route', draft.route.trim() ? `${draft.route.trim()}\n${stop}` : stop)
    setStopSearch('')
  }
  return (
    <div className="flex flex-col gap-3.5">
      <Field label="Title *">
        <input
          className={inputClass}
          required
          value={draft.title}
          onChange={(event) => set('title', event.target.value)}
        />
      </Field>
      <Field label="Route legs">
        <textarea
          className={inputClass}
          rows={4}
          value={draft.route}
          onChange={(event) => set('route', event.target.value)}
          placeholder="One stop per line, in journey order"
        />
        <span className="mt-1 block text-xs text-content-faint">
          Ordered legs will be saved as reservation endpoints.
        </span>
      </Field>
      <Field label={reservation?.type === 'flight' ? 'Add airport stop' : 'Add station / stop'}>
        <PlaceInputSearch
          tripId={tripId}
          places={places}
          world={reservation?.type === 'flight' ? { type: 'airport', strictTypeFiltering: true } : {}}
          selectedValue="name"
          value={stopSearch}
          placeholder={reservation?.type === 'flight' ? 'Search airports' : 'Search stations or places'}
          onChange={setStopSearch}
          onPick={addStop}
        />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Date">
          <input
            className={inputClass}
            type="date"
            value={draft.date}
            onChange={(event) => set('date', event.target.value)}
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Carrier">
          <input
            className={inputClass}
            value={draft.carrier}
            onChange={(event) => set('carrier', event.target.value)}
          />
        </Field>
        <Field label="Flight / train number">
          <input className={inputClass} value={draft.number} onChange={(event) => set('number', event.target.value)} />
        </Field>
        <Field label="Seat / class">
          <input className={inputClass} value={draft.seat} onChange={(event) => set('seat', event.target.value)} />
        </Field>
      </div>
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
      <Field label="Notes">
        <textarea
          className={inputClass}
          rows={2}
          value={draft.notes}
          onChange={(event) => set('notes', event.target.value)}
        />
      </Field>
    </div>
  )
}
