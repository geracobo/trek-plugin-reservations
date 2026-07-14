import {
  ArrowLeftRight,
  ArrowRight,
  Bus,
  CableCar,
  ChevronDown,
  ChevronUp,
  Clock,
  Footprints,
  MapPin,
  Pencil,
  Sailboat,
  Search,
  TramFront,
  Train,
  TrainFront,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import tzLookup from 'tz-lookup'
import type { ReservationFormProps } from '../editor-types'
import { Field, inputClass } from '../fields/FormFields'
import { TripDaySelect } from '../fields/TripDaySelect'
import { TimePicker } from '../fields/TimePicker'
import { normalizeMetadata } from '../../model'

type TransitPlace = { name: string; lat: number; lng: number; area?: string | null }
type TransitLeg = {
  mode: string
  line?: string | null
  line_color?: string | null
  line_text_color?: string | null
  duration: number
  from: { name: string; lat: number | null; lng: number | null; time?: string | null; track?: string | null }
  to: { name: string; lat: number | null; lng: number | null; time?: string | null; track?: string | null }
  [key: string]: unknown
}
type Itinerary = {
  start_time: string
  end_time: string
  duration: number
  transfers: number
  walk_seconds: number
  legs: TransitLeg[]
}

const MODE_GROUPS = [
  { key: 'rail', label: 'Train', Icon: Train, modes: 'HIGHSPEED_RAIL,LONG_DISTANCE,NIGHT_RAIL,REGIONAL_RAIL,SUBURBAN' },
  { key: 'subway', label: 'Subway', Icon: TrainFront, modes: 'SUBWAY' },
  { key: 'tram', label: 'Tram', Icon: TramFront, modes: 'TRAM' },
  { key: 'bus', label: 'Bus', Icon: Bus, modes: 'BUS,COACH' },
  { key: 'ferry', label: 'Ferry', Icon: Sailboat, modes: 'FERRY' },
  { key: 'cable', label: 'Cable car', Icon: CableCar, modes: 'FUNICULAR,AERIAL_LIFT' },
] as const

function legIcon(mode: string) {
  if (mode === 'BUS' || mode === 'COACH') return Bus
  if (mode === 'TRAM') return TramFront
  if (mode === 'SUBWAY') return TrainFront
  if (mode === 'FERRY') return Sailboat
  if (mode === 'FUNICULAR' || mode === 'AERIAL_LIFT') return CableCar
  return Train
}

function TransitLocationInput({
  tripId,
  value,
  onChange,
  label,
  quickPicks,
  near,
}: {
  tripId: number | null
  value: TransitPlace | null
  onChange: (place: TransitPlace | null) => void
  label: string
  quickPicks: TransitPlace[]
  near: string | null
}) {
  const [text, setText] = useState('')
  const [results, setResults] = useState<TransitPlace[]>([])
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const request = useRef(0)
  const root = useRef<HTMLDivElement>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  const search = (query: string) => {
    if (timer.current) clearTimeout(timer.current)
    if (!tripId || query.trim().length < 2) return setResults([])
    const id = ++request.current
    timer.current = setTimeout(async () => {
      try {
        const data = await window.trek.invoke<{ places?: TransitPlace[] }>('/transit/search', {
          method: 'POST',
          body: { tripId, query, language: navigator.language, near: near || undefined },
        })
        if (id === request.current) setResults(Array.isArray(data.places) ? data.places : [])
      } catch {
        if (id === request.current) setResults([])
      }
    }, 300)
  }
  const display = value ? value.name : text
  return (
    <div ref={root} className="relative min-w-0 flex-1">
      <label className="mb-[5px] block text-[11px] font-semibold tracking-[0.03em] text-content-faint uppercase">
        {label}
      </label>
      <div className="flex h-[38px] items-center gap-[7px] rounded-[10px] border border-edge bg-surface-input px-2.5">
        <MapPin size={14} className="shrink-0 text-content-faint" />
        <input
          className="w-full border-0 bg-transparent font-inherit text-[13px] text-content outline-none"
          value={display}
          placeholder="Search station or place…"
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            const next = event.target.value
            setText(next)
            onChange(null)
            setOpen(true)
            search(next)
          }}
        />
      </div>
      {open && (results.length > 0 || (!value && text.trim().length < 2 && quickPicks.length > 0)) ? (
        <div className="absolute top-full right-0 left-0 z-30 mt-1 max-h-60 overflow-y-auto rounded-[10px] border border-edge bg-surface-card shadow-[0_8px_32px_rgba(0,0,0,0.14)]">
          {results.length > 0
            ? results.map((place, index) => (
                <button
                  key={`${place.name}-${place.lat}-${place.lng}-${index}`}
                  type="button"
                  className="flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-2.5 py-2 text-left font-inherit text-[13px] text-content hover:bg-surface-hover"
                  onClick={() => {
                    onChange(place)
                    setText('')
                    setOpen(false)
                    setResults([])
                  }}
                >
                  <MapPin size={13} className="shrink-0 text-content-faint" />
                  <span className="truncate">
                    {place.name}
                    {place.area ? <span className="text-content-faint"> · {place.area}</span> : null}
                  </span>
                </button>
              ))
            : quickPicks.map((place, index) => (
                <button
                  key={`${place.name}-${place.lat}-${place.lng}-${index}`}
                  type="button"
                  className="flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-2.5 py-2 text-left font-inherit text-[13px] text-content hover:bg-surface-hover"
                  onClick={() => {
                    onChange(place)
                    setText('')
                    setOpen(false)
                  }}
                >
                  <MapPin size={13} className="shrink-0 text-content-faint" />
                  <span className="truncate">{place.name}</span>
                </button>
              ))}
        </div>
      ) : null}
    </div>
  )
}

function duration(seconds: number) {
  const minutes = Math.round(seconds / 60)
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ''}`
}

function legChips(legs: TransitLeg[]) {
  return legs.filter((leg) => leg.mode !== 'WALK' || leg.duration >= 60)
}

function timezoneAt(lat: number, lng: number) {
  try {
    return tzLookup(lat, lng)
  } catch {
    return 'UTC'
  }
}

/** Convert the day/time the user entered in an endpoint's local zone to UTC. */
function localToUtcIso(date: string, clock: string, timezone: string) {
  const naive = Date.parse(`${date}T${clock}:00Z`)
  const inTimezone = new Date(new Date(naive).toLocaleString('en-US', { timeZone: timezone })).getTime()
  const inUtc = new Date(new Date(naive).toLocaleString('en-US', { timeZone: 'UTC' })).getTime()
  return new Date(naive - (inTimezone - inUtc)).toISOString()
}

function time(iso: string, timezone?: string) {
  const value = new Date(iso)
  return Number.isNaN(value.getTime())
    ? ''
    : value.toLocaleTimeString(undefined, { timeZone: timezone, hour: 'numeric', minute: '2-digit' })
}

function localDateTime(iso: string, timezone: string) {
  const value = new Date(iso)
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value)
  const clock = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(value)
  return { date, time: clock, value: `${date}T${clock}` }
}

function LineBadge({ leg }: { leg: TransitLeg }) {
  const Icon = legIcon(leg.mode)
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-bold"
      style={{
        background: leg.line_color || 'var(--bg-tertiary)',
        color: leg.line_color ? leg.line_text_color || '#fff' : 'var(--text-primary)',
      }}
    >
      <Icon size={11} />
      {leg.line || leg.mode}
    </span>
  )
}

function ItineraryCard({
  itinerary,
  fromTimezone,
  toTimezone,
  expanded,
  onToggle,
  onAdd,
}: {
  itinerary: Itinerary
  fromTimezone: string
  toTimezone: string
  expanded: boolean
  onToggle: () => void
  onAdd: () => void
}) {
  const transitLegs = itinerary.legs.filter((leg) => leg.mode !== 'WALK')
  const walking = Math.round(itinerary.walk_seconds / 60)
  return (
    <article className="overflow-hidden rounded-[14px] border border-edge bg-surface-card">
      <button
        type="button"
        onClick={onToggle}
        className="block w-full cursor-pointer border-0 bg-transparent p-3.5 text-left font-inherit"
      >
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <strong className="text-[15px] tracking-tight text-content">
            {time(itinerary.start_time, fromTimezone)} – {time(itinerary.end_time, toTimezone)}
          </strong>
          <span className="text-[13px] font-semibold text-content-muted">{duration(itinerary.duration)}</span>
          <span className="ml-auto inline-flex items-center gap-2 text-xs text-content-faint">
            <span>{itinerary.transfers === 0 ? 'Direct' : `${itinerary.transfers} transfers`}</span>
            {walking ? (
              <span className="inline-flex items-center gap-1">
                <Footprints size={12} />
                {walking} min
              </span>
            ) : null}
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {itinerary.legs.map((leg, index) => (
            <span className="inline-flex items-center gap-1.5" key={`${leg.mode}-${leg.line}-${index}`}>
              {index > 0 ? <span className="text-content-faint">›</span> : null}
              {leg.mode === 'WALK' ? <Footprints size={13} className="text-content-faint" /> : <LineBadge leg={leg} />}
            </span>
          ))}
        </div>
      </button>
      {expanded ? (
        <div className="border-t border-edge-faint px-3.5 pt-3 pb-3.5">
          {itinerary.legs.map((leg, index) => {
            const color = leg.mode === 'WALK' ? 'var(--border-primary)' : leg.line_color || 'var(--text-muted)'
            return (
              <div className="grid grid-cols-[44px_18px_minmax(0,1fr)] gap-2" key={`${leg.mode}-${index}`}>
                <div className="pt-0.5 text-right text-[11px] font-semibold text-content-muted">
                  {leg.mode === 'WALK' ? '' : leg.from.time || ''}
                </div>
                <div className="flex flex-col items-center">
                  <span
                    className="mt-1 size-2.5 shrink-0 rounded-full border-[2.5px] bg-surface-card"
                    style={{ borderColor: color }}
                  />
                  {index < itinerary.legs.length - 1 ? (
                    <span
                      className="my-0.5 min-h-7 w-[3px] flex-1 rounded"
                      style={{
                        background:
                          leg.mode === 'WALK'
                            ? `repeating-linear-gradient(to bottom, ${color} 0 4px, transparent 4px 8px)`
                            : color,
                      }}
                    />
                  ) : null}
                </div>
                <div className="min-w-0 pb-3.5">
                  <div className="truncate text-[13px] font-semibold text-content">
                    {leg.mode === 'WALK' ? `Walk to ${leg.to.name}` : leg.from.name}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {leg.mode === 'WALK' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-content-faint">
                        <Footprints size={11} />
                        {duration(leg.duration)}
                      </span>
                    ) : (
                      <>
                        <LineBadge leg={leg} />
                        <span className="inline-flex items-center gap-1 text-[11px] text-content-faint">
                          {leg.headsign ? (
                            <>
                              <ArrowRight size={11} />
                              {String(leg.headsign)}
                            </>
                          ) : null}
                          {duration(leg.duration)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          <div className="grid grid-cols-[44px_18px_minmax(0,1fr)] items-center gap-2">
            <div className="text-right text-[11px] font-semibold text-content-muted">
              {time(itinerary.end_time, toTimezone)}
            </div>
            <span className="mx-auto size-2.5 rounded-full bg-content" />
            <div className="truncate text-[13px] font-bold text-content">{itinerary.legs.at(-1)?.to.name}</div>
          </div>
          <button type="button" onClick={onAdd} className="trek-btn trek-btn--primary mt-3 w-full py-2 text-xs">
            Add to itinerary
          </button>
          {transitLegs.length ? (
            <p className="mb-0 mt-2 text-[11px] text-content-faint">
              {[...new Set(transitLegs.map((leg) => String(leg.agency || '')).filter(Boolean))].join(' · ')}
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

function TransitJourneyDisplay({
  reservation,
  onDraftChange,
  onChangeRoute,
}: Pick<ReservationFormProps, 'reservation' | 'onDraftChange'> & { onChangeRoute: () => void }) {
  const [notes, setNotes] = useState(reservation?.notes || '')
  const [title, setTitle] = useState(reservation?.title || 'Public transit journey')
  const [editingTitle, setEditingTitle] = useState(false)
  const titleInput = useRef<HTMLInputElement>(null)
  const metadata = reservation ? normalizeMetadata(reservation) : {}
  const transit =
    metadata.transit && typeof metadata.transit === 'object' ? (metadata.transit as Record<string, unknown>) : null
  const legs = Array.isArray(transit?.legs) ? (transit.legs as TransitLeg[]) : []
  const durationSeconds = Number(transit?.duration) || 0
  const transfers = Number(transit?.transfers) || 0
  const walking = Number(transit?.walk_seconds) || 0
  const start = reservation?.reservation_time || ''
  const end = reservation?.reservation_end_time || ''

  useEffect(() => {
    setNotes(reservation?.notes || '')
    setTitle(reservation?.title || 'Public transit journey')
    setEditingTitle(false)
  }, [reservation?.id, reservation?.notes, reservation?.title])
  useEffect(() => {
    if (editingTitle) titleInput.current?.focus()
  }, [editingTitle])
  useEffect(() => {
    if (!reservation) return
    onDraftChange?.({ title, input: { type: 'transit', title, notes: notes.trim() || null } })
  }, [notes, onDraftChange, reservation, title])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3.5">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-[13px] bg-[rgba(124,58,237,0.1)]">
          <TramFront size={22} className="text-[#7c3aed]" />
        </div>
        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <input
              ref={titleInput}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') setEditingTitle(false)
                if (event.key === 'Escape') {
                  setTitle(reservation?.title || 'Public transit journey')
                  setEditingTitle(false)
                }
              }}
              className="w-full border-0 border-b-[1.5px] border-content bg-transparent p-0 text-[17px] font-bold tracking-tight text-content outline-none"
              aria-label="Journey title"
            />
          ) : (
            <div className="flex min-w-0 items-center gap-1.5">
              <div className="truncate text-[17px] font-bold tracking-tight text-content">{title}</div>
              <button
                type="button"
                onClick={() => setEditingTitle(true)}
                className="flex shrink-0 cursor-pointer border-0 bg-transparent p-0.5 text-content-faint hover:text-content"
                aria-label="Edit title"
              >
                <Pencil size={13} />
              </button>
            </div>
          )}
          <div className="mt-0.5 text-xs text-content-muted">
            {start
              ? `${new Date(start).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })} · ${time(start)}${end ? ` – ${time(end)}` : ''}`
              : ''}
          </div>
        </div>
        <button
          type="button"
          onClick={onChangeRoute}
          className="trek-btn trek-btn--secondary shrink-0 gap-1.5 px-3 py-2 text-xs"
        >
          <ArrowLeftRight size={13} />
          Change route
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        <div className="flex items-center gap-3 rounded-xl bg-surface-secondary p-3">
          <div className="grid size-[34px] place-items-center rounded-[10px] bg-surface-card text-content-muted">
            <Clock size={15} />
          </div>
          <div>
            <div className="text-[15px] font-bold text-content">
              {durationSeconds ? duration(durationSeconds) : '—'}
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.04em] text-content-faint">Duration</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-surface-secondary p-3">
          <div className="grid size-[34px] place-items-center rounded-[10px] bg-surface-card text-content-muted">
            <ArrowLeftRight size={15} />
          </div>
          <div>
            <div className="text-[15px] font-bold text-content">{transfers}</div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.04em] text-content-faint">Transfers</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-surface-secondary p-3">
          <div className="grid size-[34px] place-items-center rounded-[10px] bg-surface-card text-content-muted">
            <Footprints size={15} />
          </div>
          <div>
            <div className="text-[15px] font-bold text-content">{walking ? duration(walking) : '—'}</div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.04em] text-content-faint">Walking</div>
          </div>
        </div>
      </div>
      <section className="rounded-xl bg-surface-secondary p-4">
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.04em] text-content-faint">Itinerary</div>
        <div>
          {legs.map((leg, index) => {
            const color = leg.mode === 'WALK' ? 'var(--border-primary)' : leg.line_color || 'var(--text-muted)'
            return (
              <div className="grid grid-cols-[54px_18px_minmax(0,1fr)] gap-2" key={`${leg.mode}-${index}`}>
                <div className="pt-0.5 text-right text-[11px] font-semibold text-content-muted">
                  {leg.mode === 'WALK' ? '' : time(leg.from.time || '')}
                </div>
                <div className="flex flex-col items-center">
                  <span
                    className="mt-1 size-2.5 shrink-0 rounded-full border-[2.5px] bg-surface-secondary"
                    style={{ borderColor: color }}
                  />
                  {index < legs.length - 1 ? (
                    <span
                      className="my-0.5 min-h-8 w-[3px] flex-1"
                      style={{
                        background:
                          leg.mode === 'WALK'
                            ? `repeating-linear-gradient(to bottom, ${color} 0 4px, transparent 4px 8px)`
                            : color,
                      }}
                    />
                  ) : null}
                </div>
                <div className="min-w-0 pb-4">
                  <div className="truncate text-[13px] font-semibold text-content">
                    {leg.mode === 'WALK' ? `Walk to ${leg.to.name}` : leg.from.name}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {leg.mode === 'WALK' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-content-faint">
                        <Footprints size={11} />
                        {duration(leg.duration)}
                      </span>
                    ) : (
                      <>
                        <LineBadge leg={leg} />
                        <span className="inline-flex items-center gap-1 text-[11px] text-content-faint">
                          {leg.headsign ? (
                            <>
                              <ArrowRight size={11} />
                              {String(leg.headsign)}
                            </>
                          ) : null}
                          {duration(leg.duration)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          {legs.length ? (
            <div className="grid grid-cols-[54px_18px_minmax(0,1fr)] items-center gap-2">
              <div className="text-right text-[11px] font-semibold text-content-muted">{time(end)}</div>
              <span className="mx-auto size-2.5 rounded-full bg-content" />
              <div className="truncate text-[13px] font-bold text-content">{legs.at(-1)?.to.name}</div>
            </div>
          ) : (
            <p className="m-0 text-xs text-content-faint">Itinerary details are unavailable for this journey.</p>
          )}
        </div>
      </section>
      <Field label="Notes">
        <textarea
          className={inputClass}
          rows={4}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Additional notes..."
        />
      </Field>
    </div>
  )
}

export function AutomatedTransitForm({
  tripId,
  reservation,
  days,
  places,
  accommodations,
  onDraftChange,
  onSubmitDraft,
  onAutomatedTransitPlanningChange,
}: ReservationFormProps) {
  const [from, setFrom] = useState<TransitPlace | null>(null)
  const [to, setTo] = useState<TransitPlace | null>(null)
  const [dayId, setDayId] = useState('')
  const [departureTime, setDepartureTime] = useState('09:00')
  const [arriveBy, setArriveBy] = useState(false)
  const [activeModes, setActiveModes] = useState(() => new Set(MODE_GROUPS.map((mode) => mode.key)))
  const [preference, setPreference] = useState<'best' | 'transfers' | 'walking'>('best')
  const [itineraries, setItineraries] = useState<Itinerary[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Itinerary | null>(null)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [changingRoute, setChangingRoute] = useState(false)

  // Same picker inputs as TREK: the trip's mapped places and accommodations
  // are available before a search, and the first one biases Transitous results.
  const quickPicks = useMemo<TransitPlace[]>(() => {
    const picks: TransitPlace[] = []
    for (const place of places) {
      if (typeof place.lat === 'number' && typeof place.lng === 'number' && place.name)
        picks.push({ name: place.name, lat: place.lat, lng: place.lng })
    }
    for (const accommodation of accommodations) {
      const place = places.find((item) => Number(item.id) === Number(accommodation.place_id))
      if (place?.name && typeof place.lat === 'number' && typeof place.lng === 'number')
        picks.push({ name: place.name, lat: place.lat, lng: place.lng })
    }
    const seen = new Set<string>()
    return picks
      .filter((place) => {
        const key = `${place.name}:${place.lat}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, 8)
  }, [accommodations, places])
  const near = quickPicks.length ? `${quickPicks[0].lat},${quickPicks[0].lng}` : null

  useEffect(
    () => onAutomatedTransitPlanningChange?.(!reservation || changingRoute),
    [changingRoute, onAutomatedTransitPlanningChange, reservation],
  )

  useEffect(() => {
    if (!reservation) return
    setDayId(reservation.day_id ? String(reservation.day_id) : '')
    const [date = ''] = (reservation.reservation_time || '').split(/[T ]/)
    if (!reservation.day_id && date) setDayId(String(days.find((day) => day.date === date)?.id || ''))
    // TREK starts a changed route search at 09:00 rather than the saved
    // journey's departure time; only the day and endpoint prefill carry over.
    setDepartureTime('09:00')
    onDraftChange?.(null)
  }, [days, onDraftChange, reservation])

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
  const resetPlan = () => {
    setItineraries([])
    setSelected(null)
    setExpandedIndex(null)
    onDraftChange?.(null)
  }
  const toggleMode = (key: (typeof MODE_GROUPS)[number]['key']) => {
    setActiveModes((current) => {
      const next = new Set(current)
      if (next.has(key) && next.size > 1) next.delete(key)
      else next.add(key)
      return next
    })
    resetPlan()
  }
  const plan = async () => {
    const date = days.find((day) => String(day.id) === dayId)?.date
    if (!tripId || !from || !to || !date) return
    setLoading(true)
    setSelected(null)
    setItineraries([])
    setExpandedIndex(null)
    try {
      const data = await window.trek.invoke<{ itineraries?: Itinerary[] }>('/transit/plan', {
        method: 'POST',
        body: {
          tripId,
          from,
          to,
          // Match TREK: a departure time belongs to the origin, while an
          // arrive-by time belongs to the destination.
          time: localToUtcIso(
            date,
            departureTime || '09:00',
            arriveBy ? timezoneAt(to.lat, to.lng) : timezoneAt(from.lat, from.lng),
          ),
          arriveBy,
          modes:
            activeModes.size === MODE_GROUPS.length
              ? undefined
              : MODE_GROUPS.filter((mode) => activeModes.has(mode.key))
                  .map((mode) => mode.modes)
                  .join(','),
        },
      })
      setItineraries(Array.isArray(data.itineraries) ? data.itineraries : [])
    } catch (error) {
      setItineraries([])
      window.trek.notify('error', error instanceof Error ? error.message : 'Unable to plan transit')
    } finally {
      setLoading(false)
    }
  }
  const choose = (itinerary: Itinerary) => {
    if (!from || !to) return
    const fromTimezone = timezoneAt(from.lat, from.lng)
    const toTimezone = timezoneAt(to.lat, to.lng)
    const departure = localDateTime(itinerary.start_time, fromTimezone)
    const arrival = localDateTime(itinerary.end_time, toTimezone)
    const transitLegs = itinerary.legs.filter((leg) => leg.mode !== 'WALK')
    const endpoints = [
      {
        role: 'from',
        sequence: 0,
        name: from.name,
        lat: from.lat,
        lng: from.lng,
        timezone: fromTimezone,
        local_date: departure.date,
        local_time: departure.time,
      },
      ...transitLegs.slice(0, -1).flatMap((leg, index) =>
        leg.to.lat === null || leg.to.lng === null
          ? []
          : [
              {
                role: 'stop',
                sequence: index + 1,
                name: leg.to.name,
                lat: leg.to.lat,
                lng: leg.to.lng,
                timezone: timezoneAt(leg.to.lat, leg.to.lng),
                local_date: leg.to.time
                  ? localDateTime(itinerary.start_time, timezoneAt(leg.to.lat, leg.to.lng)).date
                  : null,
                local_time: leg.to.time || null,
              },
            ],
      ),
      {
        role: 'to',
        sequence: transitLegs.length,
        name: to.name,
        lat: to.lat,
        lng: to.lng,
        timezone: toTimezone,
        local_date: arrival.date,
        local_time: arrival.time,
      },
    ]
    const endDay = days.find((day) => day.date === arrival.date)
    setSelected(itinerary)
    const draft = {
      title: `${from.name} → ${to.name}`,
      input: {
        type: 'transit',
        title: `${from.name} → ${to.name}`,
        status: 'confirmed',
        day_id: Number(dayId) || null,
        end_day_id: endDay?.id || Number(dayId) || null,
        reservation_time: departure.value,
        reservation_end_time: arrival.value,
        endpoints,
        metadata: {
          transit: {
            provider: 'transitous',
            duration: itinerary.duration,
            transfers: itinerary.transfers,
            walk_seconds: itinerary.walk_seconds,
            legs: itinerary.legs,
          },
        },
        needs_review: false,
      },
    }
    onDraftChange?.(draft)
    void onSubmitDraft?.(draft)
  }
  const rankedItineraries = useMemo(() => {
    const ranked = itineraries.slice()
    if (preference === 'transfers')
      ranked.sort((left, right) => left.transfers - right.transfers || left.duration - right.duration)
    if (preference === 'walking')
      ranked.sort((left, right) => left.walk_seconds - right.walk_seconds || left.duration - right.duration)
    return ranked
  }, [itineraries, preference])

  if (reservation && !changingRoute) {
    return (
      <TransitJourneyDisplay
        reservation={reservation}
        onDraftChange={onDraftChange}
        onChangeRoute={() => {
          const endpoints = reservation.endpoints || []
          const endpointPlace = (role: 'from' | 'to') => {
            const endpoint = endpoints.find((item) => item.role === role)
            const lat = Number(endpoint?.lat)
            const lng = Number(endpoint?.lng)
            return endpoint?.name && Number.isFinite(lat) && Number.isFinite(lng)
              ? { name: endpoint.name, lat, lng }
              : null
          }
          setFrom(endpointPlace('from'))
          setTo(endpointPlace('to'))
          setChangingRoute(true)
          resetPlan()
        }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3.5">
      <section className="rounded-xl bg-surface-secondary p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(124,58,237,0.14)]">
            <TramFront size={19} className="text-[#7c3aed]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-content">Public transit</div>
            <p className="mb-0 mt-0.5 text-xs text-content-muted">
              Search real connections and add them straight to the day — data via Transitous.
            </p>
          </div>
          <div className="min-w-[190px]">
            <TripDaySelect
              value={dayId}
              onChange={(value) => {
                setDayId(value)
                resetPlan()
              }}
              options={dayOptions}
            />
          </div>
        </div>
      </section>
      <section className="rounded-xl bg-surface-secondary p-4">
        <div className="grid grid-cols-[minmax(0,1fr)_38px_minmax(0,1fr)] items-end gap-2">
          <TransitLocationInput
            tripId={tripId}
            value={from}
            onChange={(place) => {
              setFrom(place)
              resetPlan()
            }}
            label="From"
            quickPicks={quickPicks}
            near={near}
          />
          <button
            type="button"
            className="mb-0 flex h-[38px] cursor-pointer items-center justify-center rounded-[10px] border-0 bg-surface-hover text-content-muted hover:text-content"
            onClick={() => {
              const previousFrom = from
              setFrom(to)
              setTo(previousFrom)
              resetPlan()
            }}
            aria-label="Reverse route"
          >
            <ArrowLeftRight size={15} />
          </button>
          <TransitLocationInput
            tripId={tripId}
            value={to}
            onChange={(place) => {
              setTo(place)
              resetPlan()
            }}
            label="To"
            quickPicks={quickPicks}
            near={near}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-edge-faint pt-3">
          <div className="inline-flex rounded-lg bg-surface-hover p-0.5 text-xs font-medium">
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 ${!arriveBy ? 'bg-surface-card text-content shadow-sm' : 'text-content-muted'}`}
              onClick={() => {
                setArriveBy(false)
                resetPlan()
              }}
            >
              Depart
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 ${arriveBy ? 'bg-surface-card text-content shadow-sm' : 'text-content-muted'}`}
              onClick={() => {
                setArriveBy(true)
                resetPlan()
              }}
            >
              Arrive
            </button>
          </div>
          <div className="w-[132px]">
            <TimePicker
              value={departureTime}
              onChange={(value) => {
                setDepartureTime(value)
                resetPlan()
              }}
            />
          </div>
          <div className="ml-auto inline-flex rounded-lg bg-surface-hover p-0.5 text-xs font-medium">
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 ${preference === 'best' ? 'bg-surface-card text-content shadow-sm' : 'text-content-muted'}`}
              onClick={() => setPreference('best')}
            >
              Best route
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 ${preference === 'transfers' ? 'bg-surface-card text-content shadow-sm' : 'text-content-muted'}`}
              onClick={() => setPreference('transfers')}
            >
              Fewer transfers
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 ${preference === 'walking' ? 'bg-surface-card text-content shadow-sm' : 'text-content-muted'}`}
              onClick={() => setPreference('walking')}
            >
              Less walking
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <div className="flex flex-wrap gap-1.5">
            {MODE_GROUPS.map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${activeModes.has(key) ? 'border-edge bg-surface-card text-content' : 'border-transparent bg-transparent text-content-faint'}`}
                onClick={() => toggleMode(key)}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="trek-btn trek-btn--primary ml-auto gap-1.5 px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!from || !to || !dayId || loading}
            onClick={plan}
          >
            <Search size={14} />
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
      </section>
      {itineraries.length === 0 && !loading ? (
        <p className="m-0 text-xs text-content-faint">Choose both locations and a trip day to find scheduled routes.</p>
      ) : null}
      {loading ? (
        <div className="py-7 text-center text-content-faint">
          <div className="mx-auto size-5 animate-spin rounded-full border-2 border-edge border-t-content" />
        </div>
      ) : (
        rankedItineraries.map((itinerary, index) => (
          <ItineraryCard
            key={`${itinerary.start_time}-${index}`}
            itinerary={itinerary}
            fromTimezone={from ? timezoneAt(from.lat, from.lng) : 'UTC'}
            toTimezone={to ? timezoneAt(to.lat, to.lng) : 'UTC'}
            expanded={expandedIndex === index}
            onToggle={() => setExpandedIndex((current) => (current === index ? null : index))}
            onAdd={() => choose(itinerary)}
          />
        ))
      )}
    </div>
  )
}
