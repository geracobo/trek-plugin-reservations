import { TramFront } from 'lucide-react'
import { TYPE_OPTIONS } from '../model'
import { getReservationPresentation } from '../presentation'
import type { ReservationCategory } from '../presentation/types'

const MANUAL_CATEGORIES: Array<{ value: ReservationCategory; label: string }> = [
  { value: 'transportation', label: 'Transportation' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'booking', label: 'Booking' },
]

interface ReservationTypeSelectorProps {
  category?: ReservationCategory
  onChange: (type: string) => void | Promise<void>
  onCancel?: () => void
}

/**
 * This is intentionally a creation-only picker. A saved reservation's type
 * and source are part of its identity, so the editor renders that identity
 * rather than offering a way to convert it into a different kind.
 */
export function ReservationTypeSelector({ category, onChange, onCancel }: ReservationTypeSelectorProps) {
  const categories = category ? MANUAL_CATEGORIES.filter((item) => item.value === category) : MANUAL_CATEGORIES

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="m-0 text-sm text-content-muted">
          {category ? 'Choose a different reservation type.' : 'Choose the kind of reservation you want to add.'}
        </p>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="trek-btn trek-btn--ghost shrink-0 px-2 py-1 text-xs font-semibold"
          >
            Cancel
          </button>
        ) : null}
      </div>
      {categories.map(({ value: categoryValue, label }) => {
        const types = TYPE_OPTIONS.filter(
          (option) => option.value !== 'transit' && getReservationPresentation(option.value).category === categoryValue,
        )
        return (
          <section key={categoryValue} aria-labelledby={`reservation-type-${categoryValue}`}>
            <h3
              id={`reservation-type-${categoryValue}`}
              className="mb-2 text-[11px] font-semibold uppercase tracking-[0.03em] text-content-faint"
            >
              {label}
            </h3>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
              {types.map(({ value, label: typeLabel, Icon, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => void onChange(value)}
                  className="flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-edge bg-surface-card px-2 text-center text-content transition-colors hover:bg-surface-hover md:min-h-16 md:flex-row md:gap-2"
                >
                  <span
                    className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-muted"
                    style={{ color }}
                    aria-hidden="true"
                  >
                    <Icon size={17} />
                  </span>
                  <span className="text-sm font-semibold">{typeLabel}</span>
                </button>
              ))}
            </div>
          </section>
        )
      })}
      {!category ? (
        <section className="border-t border-edge-faint pt-4" aria-labelledby="reservation-type-connected">
          <h3
            id="reservation-type-connected"
            className="mb-2 text-[11px] font-semibold uppercase tracking-[0.03em] text-content-faint"
          >
            Connected services
          </h3>
          <button
            type="button"
            onClick={() => void onChange('transit')}
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-[rgba(124,58,237,0.25)] bg-[rgba(124,58,237,0.08)] px-3.5 py-3 text-left text-content hover:bg-[rgba(124,58,237,0.13)]"
          >
            <span
              className="grid size-9 shrink-0 place-items-center rounded-lg bg-[rgba(124,58,237,0.14)] text-[#7c3aed]"
              aria-hidden="true"
            >
              <TramFront size={18} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">Plan a transit journey</span>
              <span className="block text-xs text-content-muted">
                Find and add a public-transit route to your trip.
              </span>
            </span>
          </button>
        </section>
      ) : null}
    </div>
  )
}
