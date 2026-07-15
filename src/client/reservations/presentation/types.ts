import type { LucideIcon } from 'lucide-react'
import type { Accommodation, Day, Reservation, Trip } from '../types'

export type ReservationCategory = 'transportation' | 'accommodation' | 'booking'
export type ReservationProvenanceKind = 'manual' | 'imported' | 'synced'

/** Describes where a reservation originated and whether TREK actively synchronizes it. */
export interface ReservationProvenance {
  kind: ReservationProvenanceKind
  provider: string | null
}

export interface ReservationPresentationContext {
  days: Day[]
  accommodations: Accommodation[]
  /** The active trip, when a surface needs to describe a reservation relative to its timeline. */
  trip?: Trip | null
}

/** A renderable piece of shared presentation content. Parts are ordered, so the registry controls icon placement. */
export type ReservationPresentationContentPart =
  { kind: 'icon'; Icon: LucideIcon } | { kind: 'text' | 'muted' | 'strong'; value: string }

/**
 * A stable presentation value. Functions may return a simple string or rich
 * ordered parts; use `reservationPresentationContentText` where plain text is needed.
 */
export type ReservationPresentationContent = string | ReservationPresentationContentPart[]

export interface ReservationDetailField {
  key: string
  label: string
  value: string
  /** Card layout hint: compact fields share a row; full fields span the card's field grid. */
  cardWidth?: 'compact' | 'full'
  /** Card layout hint for the value's horizontal alignment. */
  cardAlignment?: 'start' | 'center'
}

export interface ReservationPresentationDefinition {
  type: string
  label: string
  category: ReservationCategory
  Icon: LucideIcon
  color: string

  /** Returns the type-appropriate title shown in shared lists, cards, and calendars. */
  getTitle: (reservation: Reservation, context: ReservationPresentationContext) => string

  /**
   * Returns whether the entry is local, a one-time external import, or actively
   * synchronized with an external provider. This reads reservation-level data;
   * it is deliberately not static type metadata.
   */
  getProvenance: (reservation: Reservation) => ReservationProvenance
  /**
   * Returns the reservation's canonical local start for sorting and placement.
   * The result is `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm`; it is not a UTC instant.
   */
  getStart: (reservation: Reservation, context: ReservationPresentationContext) => string | null

  /**
   * Returns the reservation's canonical local end when one is meaningful.
   * The result uses the same local ISO-like representation as `getStart`.
   */
  getEnd: (reservation: Reservation, context: ReservationPresentationContext) => string | null

  /** Returns the type-appropriate schedule content shown by shared views. */
  getScheduleContent: (
    reservation: Reservation,
    context: ReservationPresentationContext,
  ) => ReservationPresentationContent

  /** Returns canonical trip-relative content, such as `Ends during trip · Day 5 · Sep 5`. */
  getTripDaysContent: (
    reservation: Reservation,
    context: ReservationPresentationContext,
  ) => ReservationPresentationContent | null

  /** Returns ordered route labels; non-route reservations return an empty array. */
  getRoute: (reservation: Reservation, context: ReservationPresentationContext) => string[]

  /** Returns the primary display location, or `null` when the type has none. */
  getLocation: (reservation: Reservation, context: ReservationPresentationContext) => string | null

  /** Returns small type-specific values that generic detail surfaces may render; returns `[]` when absent. */
  getDetailFields: (reservation: Reservation, context: ReservationPresentationContext) => ReservationDetailField[]
}
