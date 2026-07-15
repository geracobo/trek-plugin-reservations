import { ChevronRight, Footprints, Plane } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Accommodation, Day, Reservation } from '../types'
import { normalizeMetadata } from '../model'
import { getReservationPresentation, type ReservationPresentationContent } from '../presentation'

interface ReservationCardFieldProps {
  label: string
  value: ReservationPresentationContent | null | undefined
  mono?: boolean
  centered?: boolean
  Icon?: LucideIcon
  className?: string
}

/** Renders a simple labeled card value with the shared reservation field styling. */
export function ReservationCardField({
  label,
  value,
  mono = false,
  centered = false,
  Icon,
  className = '',
}: ReservationCardFieldProps) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null
  const isRichContent = Array.isArray(value)
  return (
    <div className={`min-w-0 ${className}`}>
      <div
        className={`mb-[5px] text-[10px] font-extrabold uppercase text-content-faint ${centered ? 'text-center' : ''}`}
      >
        {label}
      </div>
      <div
        className={`min-h-[34px] rounded-[10px] bg-surface-muted px-2.5 py-2 text-[12.5px] font-semibold text-content ${Icon || isRichContent ? `flex items-center gap-1.5 ${isRichContent ? 'flex-wrap' : ''} ${centered ? 'justify-center' : ''}` : '[overflow-wrap:anywhere]'} ${mono ? 'font-mono' : ''} ${centered ? 'text-center' : ''}`}
      >
        {isRichContent ? (
          <>
            {Icon ? <Icon className="shrink-0 text-content-faint" size={14} /> : null}
            {value.map((part, index) =>
              part.kind === 'icon' ? (
                <part.Icon className="shrink-0 text-content-faint" size={14} key={index} />
              ) : part.kind === 'strong' ? (
                <strong key={index}>{part.value}</strong>
              ) : (
                <span className={part.kind === 'muted' ? 'text-content-muted' : ''} key={index}>
                  {part.value}
                </span>
              ),
            )}
          </>
        ) : Icon ? (
          <>
            <Icon className="shrink-0 text-content-faint" size={14} />
            <span className="min-w-0 truncate">{value}</span>
          </>
        ) : (
          value
        )}
      </div>
    </div>
  )
}

function ReservationCardFieldRouteValue({ route, Icon }: { route: string[]; Icon: typeof Plane }) {
  if (route.length < 2) return null
  return (
    <div className="min-w-0">
      <div className="mb-[5px] text-[10px] font-extrabold uppercase text-content-faint">Route</div>
      <div className="flex flex-wrap items-center justify-center gap-2 rounded-[10px] bg-surface-muted px-3 py-2 text-[12.5px] text-content">
        {route.map((name, index) => (
          <span className="inline-flex min-w-0 items-center gap-2 font-semibold" key={`${name}-${index}`}>
            {index > 0 ? <Icon className="shrink-0 text-[var(--reservation-color)]" size={14} /> : null}
            <span className="truncate">{name}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

type TransitLeg = {
  mode?: string
  line?: string | null
  line_color?: string | null
  line_text_color?: string | null
  duration?: number
}

function TransitLegChips({ reservation }: { reservation: Reservation }) {
  const metadata = normalizeMetadata(reservation)
  const transit = metadata.transit
  const transitMetadata = transit && typeof transit === 'object' ? (transit as Record<string, unknown>) : null
  const rawLegs = Array.isArray(transitMetadata?.legs)
    ? transitMetadata.legs
    : Array.isArray(metadata.legs)
      ? metadata.legs
      : []
  const legs = rawLegs
    .filter((leg): leg is TransitLeg => Boolean(leg) && typeof leg === 'object')
    .filter((leg) => leg.mode !== 'WALK' || (leg.duration || 0) >= 60)
  if (legs.length === 0) return null

  return (
    <div className="min-w-0">
      <div className="mb-[5px] text-[10px] font-extrabold uppercase text-content-faint">Route</div>
      <div className="flex min-h-[34px] flex-wrap items-center justify-center gap-1.5 rounded-[10px] bg-surface-muted px-2.5 py-2 text-[11px]">
        {legs.map((leg, index) => (
          <span className="inline-flex items-center gap-1.5" key={`${leg.mode}-${leg.line}-${index}`}>
            {index > 0 ? <ChevronRight className="text-content-faint" size={12} /> : null}
            {leg.mode === 'WALK' ? (
              <span className="inline-flex items-center gap-0.5 font-semibold text-content-faint">
                <Footprints size={13} />
                {Math.round((leg.duration || 0) / 60)}
              </span>
            ) : (
              <span
                className="rounded-[5px] px-1.5 py-0.5 text-[10.5px] font-bold leading-none"
                style={{
                  background: leg.line_color || 'var(--bg-tertiary)',
                  color: leg.line_color ? leg.line_text_color || '#fff' : 'var(--text-primary)',
                }}
              >
                {leg.line || leg.mode}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}

export function ReservationCardFieldRoute({
  reservation,
  Icon,
  days,
  accommodations,
}: {
  reservation: Reservation
  Icon: typeof Plane
  days: Day[]
  accommodations: Accommodation[]
}) {
  if (reservation.type === 'transit') return <TransitLegChips reservation={reservation} />
  return (
    <ReservationCardFieldRouteValue
      route={getReservationPresentation(reservation).getRoute(reservation, { days, accommodations })}
      Icon={Icon}
    />
  )
}
