import { useEffect, useState } from 'react'
import { ArrowLeft, Hotel, Ticket, TramFront } from 'lucide-react'
import { TYPE_OPTIONS, TRANSPORT_TYPES } from '../model'

export type ReservationTypeCategory = 'transit' | 'accommodation' | 'booking'

const categories: Array<{ value: ReservationTypeCategory; label: string; Icon: typeof TramFront }> = [
  { value: 'transit', label: 'Transit', Icon: TramFront },
  { value: 'accommodation', label: 'Accommodation', Icon: Hotel },
  { value: 'booking', label: 'Booking', Icon: Ticket },
]

function categoryForType(type: string | null | undefined): ReservationTypeCategory {
  if (TRANSPORT_TYPES.has(type || '')) return 'transit'
  if (type === 'hotel') return 'accommodation'
  return 'booking'
}

interface ReservationTypeSelectorProps {
  value?: string
  startingValue?: string
  startingCategory?: ReservationTypeCategory
  showBackButton?: boolean
  onChange: (type: string) => void
}

export function ReservationTypeSelector({
  value,
  startingValue,
  startingCategory,
  showBackButton = true,
  onChange,
}: ReservationTypeSelectorProps) {
  const initialType = value || startingValue
  const [category, setCategory] = useState<ReservationTypeCategory | null>(
    () => startingCategory || (initialType ? categoryForType(initialType) : null),
  )
  useEffect(() => {
    if (startingCategory) setCategory(startingCategory)
    else if (value || startingValue) setCategory(categoryForType(value || startingValue))
  }, [value, startingValue, startingCategory])
  const activeCategory = category ? categories.find((item) => item.value === category) : null
  const subtypes = category
    ? TYPE_OPTIONS.filter((option) => categoryForType(option.value) === category && option.value !== 'transit')
    : []
  const selectCategory = (nextCategory: ReservationTypeCategory) => {
    setCategory(nextCategory)
    const firstType = TYPE_OPTIONS.find(
      (option) => categoryForType(option.value) === nextCategory && option.value !== 'transit',
    )
    if (firstType) onChange(firstType.value)
  }

  useEffect(() => {
    if (!startingCategory || value) return
    const firstType = TYPE_OPTIONS.find(
      (option) => categoryForType(option.value) === startingCategory && option.value !== 'transit',
    )
    if (firstType) onChange(firstType.value)
  }, [onChange, startingCategory, value])

  if (!category) {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {categories.map(({ value: categoryValue, label, Icon }) => (
          <button
            key={categoryValue}
            type="button"
            onClick={() => selectCategory(categoryValue)}
            className="flex min-h-20 cursor-pointer items-center gap-3 rounded-xl border border-edge bg-surface-card px-3.5 text-left text-content transition-colors hover:bg-surface-hover"
          >
            <span className="grid size-9 place-items-center rounded-lg bg-surface-muted text-content-muted">
              <Icon size={18} />
            </span>
            <span className="text-sm font-semibold">{label}</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[auto_1fr] items-start gap-x-[5px] gap-y-2">
      <div className="flex items-center gap-[5px]">
        {showBackButton ? (
          <button
            type="button"
            onClick={() => setCategory(null)}
            className="mr-1 grid size-7 cursor-pointer place-items-center rounded-lg text-content-muted hover:bg-surface-hover hover:text-content"
            aria-label="Choose reservation category"
          >
            <ArrowLeft size={16} />
          </button>
        ) : null}
        <span className="mr-1 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.03em] text-content-faint">
          {activeCategory?.label}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-[5px]">
        {subtypes.map(({ value: type, label, Icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            className={
              value === type
                ? 'cursor-pointer bg-[var(--text-primary)] text-[var(--bg-primary)]'
                : 'cursor-pointer bg-surface-card text-content-muted'
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '5px 10px',
              borderRadius: 99,
              border: `1px solid ${value === type ? 'var(--text-primary)' : 'var(--border-primary)'}`,
              fontSize: 11,
              fontWeight: 500,
            }}
          >
            <Icon size={11} />
            {label}
          </button>
        ))}
      </div>
      {category === 'transit' ? (
        <>
          <div />
          <div>
            <button
              type="button"
              onClick={() => onChange('transit')}
              className={`inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${value === 'transit' ? 'border-[#7c3aed] bg-[rgba(124,58,237,0.16)] text-[#7c3aed]' : 'border-[rgba(124,58,237,0.25)] bg-[rgba(124,58,237,0.08)] text-content'}`}
            >
              <TramFront size={14} className="text-[#7c3aed]" />
              Automated transit
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}
