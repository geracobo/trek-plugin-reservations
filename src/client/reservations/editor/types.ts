import type { Accommodation, Day, Place, Reservation, ReservationFile } from '../types'

export type ReservationFormKind =
  | 'multi-leg-transport'
  | 'point-to-point-transport'
  | 'automated-transit'
  | 'accommodation'
  | 'single-date-booking'
  | 'multi-date-booking'

export interface ReservationFormProps {
  reservation: Reservation | null
  days: Day[]
  places: Place[]
  accommodations: Accommodation[]
  files: ReservationFile[]
}

export function reservationFormKind(type: string | null | undefined): ReservationFormKind {
  if (type === 'flight' || type === 'train') return 'multi-leg-transport'
  if (type === 'transit') return 'automated-transit'
  if (type === 'hotel') return 'accommodation'
  if (type === 'restaurant') return 'single-date-booking'
  if (['bus', 'car', 'taxi', 'bicycle', 'cruise', 'ferry', 'transport_other'].includes(type || ''))
    return 'point-to-point-transport'
  return 'multi-date-booking'
}
