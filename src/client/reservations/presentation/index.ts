import type { Reservation } from '../types'
import { RESERVATION_PRESENTATIONS, type ReservationPresentationType } from './registry'
import type { ReservationPresentationContent, ReservationPresentationDefinition } from './types'

export type {
  ReservationCategory,
  ReservationDetailField,
  ReservationPresentationContent,
  ReservationPresentationContentPart,
  ReservationPresentationContext,
  ReservationPresentationDefinition,
  ReservationProvenance,
  ReservationProvenanceKind,
} from './types'
export { RESERVATION_PRESENTATIONS } from './registry'

/**
 * Returns the presentation contract for a raw TREK reservation or type key.
 * Unknown and missing types deliberately use the generic `other` definition.
 */
export function getReservationPresentation(
  reservation: Reservation | string | null | undefined,
): ReservationPresentationDefinition {
  const type = typeof reservation === 'string' ? reservation : reservation?.type
  return RESERVATION_PRESENTATIONS[type as ReservationPresentationType] || RESERVATION_PRESENTATIONS.other
}

/** Converts either form of presentation content into a plain-text value for text-only surfaces. */
export function reservationPresentationContentText(content: ReservationPresentationContent): string {
  return typeof content === 'string'
    ? content
    : content
        .filter((part) => part.kind !== 'icon')
        .map((part) => part.value)
        .join(' ')
}
