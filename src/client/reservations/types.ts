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
  [key: string]: unknown
}

export interface ReservationEndpoint {
  id?: number
  name?: string
  role?: string
  sequence?: number
  [key: string]: unknown
}

export interface ReservationFile {
  id?: number
  filename?: string
  original_name?: string
  reservation_id?: number | null
  linked_reservation_ids?: number[]
  [key: string]: unknown
}

export interface Reservation {
  id: number
  place_id?: number | null
  type?: string
  title?: string | null
  status?: string | null
  reservation_time?: string | null
  reservation_end_time?: string | null
  confirmation_number?: string | null
  location?: string | null
  place_name?: string | null
  accommodation_name?: string | null
  notes?: string | null
  url?: string | null
  booking_url?: string | null
  needs_review?: boolean | null
  external_source?: string | null
  sync_enabled?: boolean | null
  metadata?: string | Record<string, unknown> | null
  endpoints?: ReservationEndpoint[] | null
  files?: ReservationFile[]
  [key: string]: unknown
}

export interface ReservationsResponse {
  trip: Trip
  reservations: Reservation[]
  places: Place[]
}

export type ViewMode = 'cards' | 'table' | 'calendar'
export type StatusFilter = 'all' | 'confirmed' | 'pending'
