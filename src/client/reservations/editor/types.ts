import type { Accommodation, Day, Place, Reservation, ReservationFile } from '../types'

export type ReservationFormKind =
  | 'multi-endpoint-transport'
  | 'point-to-point-transport'
  | 'automated-transit'
  | 'accommodation'
  | 'single-date-booking'
  | 'multi-date-booking'

export interface ReservationFormProps {
  tripId: number | null
  type: string
  reservation: Reservation | null
  days: Day[]
  places: Place[]
  accommodations: Accommodation[]
  files: ReservationFile[]
  onDraftChange?: (draft: ReservationDraft | null) => void
}

/** A form emits a host-ready reservation payload; the editor owns persistence. */
export interface ReservationDraft {
  title: string
  input: Record<string, unknown>
  accommodation?: {
    id?: number | null
    place_id?: number | null
    start_day_id?: number | null
    end_day_id?: number | null
    check_in?: string | null
    check_in_end?: string | null
    check_out?: string | null
    confirmation?: string | null
  }
}

/**
 * The form behavior for every reservation type supported by TREK. Keep this
 * table exhaustive: it is the single source of truth for editor selection and
 * later, payload serialization.
 */
export const RESERVATION_TYPE_BEHAVIOR = {
  flight: 'multi-endpoint-transport',
  train: 'multi-endpoint-transport',
  bus: 'point-to-point-transport',
  car: 'point-to-point-transport',
  taxi: 'point-to-point-transport',
  bicycle: 'point-to-point-transport',
  cruise: 'point-to-point-transport',
  ferry: 'point-to-point-transport',
  transit: 'automated-transit',
  transport_other: 'point-to-point-transport',
  hotel: 'accommodation',
  restaurant: 'single-date-booking',
  event: 'multi-date-booking',
  tour: 'multi-date-booking',
  other: 'multi-date-booking',
} as const satisfies Record<string, ReservationFormKind>

export type ReservationType = keyof typeof RESERVATION_TYPE_BEHAVIOR

export function reservationFormKind(type: string | null | undefined): ReservationFormKind {
  return RESERVATION_TYPE_BEHAVIOR[type as ReservationType] ?? 'multi-date-booking'
}
