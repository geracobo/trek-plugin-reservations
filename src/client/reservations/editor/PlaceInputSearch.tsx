import { MapPin, Plane, X } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { inputClass } from './FormFields'

export interface PlaceInputSearchResult {
  osm_id?: string
  google_place_id?: string
  name: string
  address: string
  lat?: number | null
  lng?: number | null
  source?: 'google' | 'openstreetmap' | 'trip'
  iata?: string
  icao?: string | null
  city?: string
  country?: string
  timezone?: string
}

export type PlaceSearchType = 'airport' | 'world-place' | 'trek-place'

interface PlaceInputSearchProps {
  tripId: number | null
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Locations display a name; free-text address fields display an address. */
  selectedValue?: 'name' | 'address'
  /** Defaults to 320ms, which is a practical Google Places typeahead cadence. */
  debounceMs?: number
  /** What this field represents; the component chooses the lookup implementation. */
  searchType: PlaceSearchType
  onPick?: (place: PlaceInputSearchResult) => void
  /** A structured location has been picked, so show TREK's clear affordance. */
  selected?: boolean
  /** Clears the structured selection; typing then continues as free text. */
  onClear?: () => void
}

export function PlaceInputSearch({
  tripId,
  value,
  onChange,
  placeholder,
  selectedValue = 'address',
  debounceMs = 320,
  searchType,
  onPick,
  selected = false,
  onClear,
}: PlaceInputSearchProps) {
  const [remoteResults, setRemoteResults] = useState<PlaceInputSearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const [remoteSource, setRemoteSource] = useState<string | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const requestRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const airport = searchType === 'airport'
  const trekPlaces = searchType === 'trek-place'
  const results = remoteResults

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  const search = (text: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    const query = text.trim()
    if (!tripId || query.length < (airport ? 2 : 3)) {
      setRemoteResults([])
      setLoading(false)
      return
    }
    const requestId = ++requestRef.current
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const data = trekPlaces
          ? await window.trek.invoke<{
              places?: PlaceInputSearchResult[]
              source?: string
            }>(`/trip-places?tripId=${encodeURIComponent(String(tripId))}&q=${encodeURIComponent(query)}`)
          : await window.trek.invoke<{
              places?: PlaceInputSearchResult[]
              source?: string
            }>('/map-locations', {
              method: 'POST',
              body: {
                tripId,
                query,
                language: navigator.language,
                sources: ['google', 'nominatim'],
                type: airport ? 'airport' : undefined,
                strictTypeFiltering: false,
              },
            })
        if (requestId === requestRef.current) {
          setRemoteResults(Array.isArray(data.places) ? data.places : [])
          setRemoteSource(typeof data.source === 'string' ? data.source : null)
          setHighlight(-1)
        }
      } catch {
        if (requestId === requestRef.current) setRemoteResults([])
      } finally {
        if (requestId === requestRef.current) setLoading(false)
      }
    }, debounceMs)
  }

  const pick = (place: PlaceInputSearchResult) => {
    onChange(
      airport
        ? `${place.city || place.name} (${place.iata || ''})`
        : selectedValue === 'name'
          ? place.name || place.address
          : place.address || place.name,
    )
    onPick?.(place)
    setOpen(false)
    setRemoteResults([])
    setLoading(false)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') setOpen(false)
    if (!open || results.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlight((index) => Math.min(index + 1, results.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlight((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter' && highlight >= 0) {
      event.preventDefault()
      pick(results[highlight])
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      {airport ? (
        <Plane
          className="pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2 text-content-faint"
          size={14}
        />
      ) : (
        <MapPin
          className="pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2 text-content-faint"
          size={14}
        />
      )}
      <input
        className={inputClass}
        style={{ paddingLeft: 34, paddingRight: selected ? 34 : undefined }}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(event) => {
          const insertedText = (event.nativeEvent as InputEvent).data
          const nextValue = selected ? insertedText || '' : event.target.value
          if (selected) onClear?.()
          onChange(nextValue)
          setOpen(true)
          search(nextValue)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {selected && (
        <button
          type="button"
          onClick={() => {
            onClear?.()
            onChange('')
            setOpen(false)
            setRemoteResults([])
          }}
          className="absolute top-1/2 right-2 z-10 flex -translate-y-1/2 border-0 bg-transparent p-0.5 text-content-faint hover:text-content"
          aria-label="Clear"
        >
          <X size={14} />
        </button>
      )}
      {open && (loading || results.length > 0) && (
        <div className="absolute top-[calc(100%+4px)] right-0 left-0 z-50 max-h-64 overflow-y-auto rounded-lg border border-edge bg-surface-card shadow-lg">
          {loading && results.length === 0 && (
            <p className="m-0 px-3 py-2 text-xs text-content-faint">Searching places…</p>
          )}
          {results.map((place, index) => (
            <button
              key={place.google_place_id || place.osm_id || place.iata || `${place.name}-${index}`}
              type="button"
              className={`flex w-full items-start gap-2 border-0 px-3 py-2 text-left font-inherit ${index === highlight ? 'bg-surface-hover' : 'bg-transparent'}`}
              onMouseEnter={() => setHighlight(index)}
              onClick={() => pick(place)}
            >
              {airport ? (
                <Plane size={14} className="mt-0.5 shrink-0 text-content-faint" />
              ) : (
                <MapPin size={14} className="mt-0.5 shrink-0 text-content-faint" />
              )}
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-content">
                  {airport ? `${place.city || place.name} (${place.iata || ''})` : place.name || place.address}
                  {place.source === 'trip' ? ' · Trip place' : ''}
                </span>
                {(airport ? place.name : place.address && place.name !== place.address) && (
                  <span className="block truncate text-xs text-content-faint">
                    {airport ? `${place.name}${place.country ? ` · ${place.country}` : ''}` : place.address}
                  </span>
                )}
              </span>
            </button>
          ))}
          {remoteSource === 'openstreetmap' && remoteResults.length > 0 && (
            <p className="m-0 border-t border-edge px-3 py-1.5 text-[11px] text-content-faint">
              Search data © OpenStreetMap contributors
            </p>
          )}
        </div>
      )}
    </div>
  )
}
