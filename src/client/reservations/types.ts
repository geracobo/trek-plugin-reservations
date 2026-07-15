export interface TrekContext {
  tripId: number | null
  theme?: string
  user?: {
    id?: number
    name?: string
    username?: string
  } | null
}

export interface TrekBridge {
  onContext(callback: (ctx: TrekContext) => void): () => void
  invoke<T = unknown>(sub: string, init?: { method?: string; body?: unknown }): Promise<T>
  notify(level: 'success' | 'error' | 'info' | 'warning', message: string): void
  openExternal(url: string): void
  confirm(options: {
    title?: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    danger?: boolean
  }): Promise<boolean>
}

declare global {
  interface Window {
    trek: TrekBridge
  }
}

export interface Trip {
  id: number
  title?: string
  start_date?: string | null
  end_date?: string | null
  currency?: string | null
  [key: string]: unknown
}

export interface Place {
  id: number
  name?: string
  address?: string | null
  lat?: number | null
  lng?: number | null
  [key: string]: unknown
}

export interface Day {
  id: number
  day_number?: number
  date?: string | null
  title?: string | null
  assignments?: unknown[]
  notes_items?: unknown[]
  [key: string]: unknown
}

export interface Accommodation {
  id: number
  place_id?: number | null
  start_day_id?: number | null
  end_day_id?: number | null
  check_in?: string | null
  check_in_end?: string | null
  check_out?: string | null
  confirmation?: string | null
  notes?: string | null
  [key: string]: unknown
}

export interface ReservationEndpoint {
  id?: number
  name?: string
  role?: 'from' | 'to' | 'stop'
  sequence?: number
  code?: string | null
  lat?: number | null
  lng?: number | null
  timezone?: string | null
  local_date?: string | null
  local_time?: string | null
  [key: string]: unknown
}

export interface ReservationFile {
  id?: number
  filename?: string
  original_name?: string
  name?: string
  mimetype?: string
  size?: number
  url?: string
  reservation_id?: number | null
  linked_reservation_ids?: number[]
  [key: string]: unknown
}

export interface Reservation {
  // Direct `ctx.trips.getReservations()` fields.
  id: number
  place_id?: number | null
  assignment_id?: number | null
  day_id?: number | null
  end_day_id?: number | null
  accommodation_id?: number | null
  type?: string
  title?: string | null
  status?: string | null
  reservation_time?: string | null
  reservation_end_time?: string | null
  confirmation_number?: string | null
  // Returned by TREK when present; `enrichReservations()` falls back to the
  // linked place address only when it is missing.
  location?: string | null
  notes?: string | null
  url?: string | null
  booking_url?: string | null
  needs_review?: boolean | null
  external_source?: string | null
  sync_enabled?: boolean | null
  metadata?: string | Record<string, unknown> | null
  endpoints?: ReservationEndpoint[] | null

  // TREK's reservation query may include these joined display fields.
  accommodation_name?: string | null

  // Added or completed by this plugin's `enrichReservations()` helper using
  // `ctx.trips.getPlaces()` and `ctx.files.list()`.
  place_name?: string | null
  files?: ReservationFile[]
  [key: string]: unknown
}

export interface Cost {
  id: number
  reservation_id?: number | null
  name?: string
  total_price?: number | null
  currency?: string | null
  category?: string | null
  expense_date?: string | null
  [key: string]: unknown
}

export interface ReservationsResponse {
  // `ctx.trips.getById()`
  trip: Trip
  // `getReservations()`, then `enrichReservations()`.
  reservations: Reservation[]
  // Supplementary endpoint collections, used for reservation form hydration.
  places: Place[]
  days: Day[]
  accommodations: Accommodation[]
  files: ReservationFile[]
  costs: Cost[]
}

export type ViewMode = 'cards' | 'table' | 'calendar'
export type StatusFilter = 'all' | 'confirmed' | 'pending'
