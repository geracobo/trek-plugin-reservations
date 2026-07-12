import { useEffect, useState } from 'react'
import type { ReservationFormProps } from '../types'
import { Field, inputClass } from '../FormFields'
import { reservationRoute } from '../../model'

export function PointToPointTransportForm({ reservation }: ReservationFormProps) {
  const [draft, setDraft] = useState({
    title: '',
    from: '',
    to: '',
    date: '',
    startTime: '',
    endDate: '',
    endTime: '',
    code: '',
    status: 'pending',
    notes: '',
  })
  useEffect(() => {
    const route = reservation ? reservationRoute(reservation) : []
    const [date = '', startTime = ''] = (reservation?.reservation_time || '').split(/[T ]/)
    const [endDate = '', endTime = ''] = (reservation?.reservation_end_time || '').split(/[T ]/)
    setDraft({
      title: reservation?.title || '',
      from: route[0] || '',
      to: route.at(-1) || '',
      date,
      startTime: startTime.slice(0, 5),
      endDate,
      endTime: endTime.slice(0, 5),
      code: reservation?.confirmation_number || '',
      status: reservation?.status || 'pending',
      notes: reservation?.notes || '',
    })
  }, [reservation])
  const set = (key: keyof typeof draft, value: string) => setDraft((current) => ({ ...current, [key]: value }))
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="From">
          <input className={inputClass} value={draft.from} onChange={(event) => set('from', event.target.value)} />
        </Field>
        <Field label="To">
          <input className={inputClass} value={draft.to} onChange={(event) => set('to', event.target.value)} />
        </Field>
      </div>
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
