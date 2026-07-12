import { MapPin, Plane } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { inputClass } from './FormFields'

export interface PlaceInputSearchResult {
  osm_id?: string
  google_place_id?: string
  name: string
  address: string
  source?: 'google' | 'openstreetmap' | 'trip'
}

interface TripPlace {
  id: number
  name?: string
  address?: string
}

export interface WorldPlaceLookup {
  sources?: Array<'google' | 'nominatim'>
  type?: string
  strictTypeFiltering?: boolean
}

export interface TrekPlaceLookup {
  filter?: (place: TripPlace) => boolean
}

interface PlaceInputSearchProps {
  tripId: number | null
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Locations display a name; free-text address fields display an address. */
  selectedValue?: 'name' | 'address'
  /** Defaults to 320ms, which is a practical Google Places typeahead cadence. */
  debounceMs?: number
  /** Set false to omit external world-place lookup. */
  world?: WorldPlaceLookup | false
  /** Set false to omit places already saved in this TREK trip. */
  trekPlaces?: TrekPlaceLookup | false
  places?: TripPlace[]
  onPick?: (place: PlaceInputSearchResult) => void
}

export function PlaceInputSearch({
  tripId,
  value,
  onChange,
  placeholder,
  selectedValue = 'address',
  debounceMs = 320,
  world = {},
  trekPlaces = {},
  places = [],
  onPick,
}: PlaceInputSearchProps) {
  const [remoteResults, setRemoteResults] = useState<PlaceInputSearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const [remoteSource, setRemoteSource] = useState<string | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const requestRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const query = value.trim().toLocaleLowerCase()
  const localResults: PlaceInputSearchResult[] =
    trekPlaces !== false && query.length >= 2
      ? places
          .filter((place) => trekPlaces.filter?.(place) ?? true)
          .filter((place) => `${place.name || ''} ${place.address || ''}`.toLocaleLowerCase().includes(query))
          .slice(0, 5)
          .map((place) => ({
            osm_id: `trip:${place.id}`,
            name: place.name || place.address || `Place ${place.id}`,
            address: place.address || '',
            source: 'trip',
          }))
      : []
  const results = [...localResults, ...remoteResults]

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
    if (!tripId || world === false || query.length < 3) {
      setRemoteResults([])
      setLoading(false)
      return
    }
    const requestId = ++requestRef.current
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await window.trek.invoke<{
          places?: PlaceInputSearchResult[]
          source?: string
        }>('/map-locations', {
          method: 'POST',
          body: {
            tripId,
            query,
            language: navigator.language,
            sources: world.sources ?? ['google', 'nominatim'],
            type: world.type,
            strictTypeFiltering: world.strictTypeFiltering === true,
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
    onChange(selectedValue === 'name' ? place.name || place.address : place.address || place.name)
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
      <input
        className={inputClass}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(event) => {
          onChange(event.target.value)
          setOpen(true)
          search(event.target.value)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {open && (loading || results.length > 0) && (
        <div className="absolute top-[calc(100%+4px)] right-0 left-0 z-50 max-h-64 overflow-y-auto rounded-lg border border-edge bg-surface-card shadow-lg">
          {loading && results.length === 0 && (
            <p className="m-0 px-3 py-2 text-xs text-content-faint">Searching places…</p>
          )}
          {results.map((place, index) => (
            <button
              key={place.google_place_id || place.osm_id || `${place.name}-${index}`}
              type="button"
              className={`flex w-full items-start gap-2 border-0 px-3 py-2 text-left font-inherit ${index === highlight ? 'bg-surface-hover' : 'bg-transparent'}`}
              onMouseEnter={() => setHighlight(index)}
              onClick={() => pick(place)}
            >
              {world !== false && world.type === 'airport' ? (
                <Plane size={14} className="mt-0.5 shrink-0 text-content-faint" />
              ) : (
                <MapPin size={14} className="mt-0.5 shrink-0 text-content-faint" />
              )}
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-content">
                  {place.name || place.address}
                  {place.source === 'trip' ? ' · Trip place' : ''}
                </span>
                {place.address && place.name !== place.address && (
                  <span className="block truncate text-xs text-content-faint">{place.address}</span>
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
