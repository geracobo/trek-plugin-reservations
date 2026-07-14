import type { LucideIcon } from 'lucide-react'

interface ReservationCardFieldProps {
  label: string
  value: string | null | undefined
  mono?: boolean
  centered?: boolean
  Icon?: LucideIcon
}

export function ReservationCardField({
  label,
  value,
  mono = false,
  centered = false,
  Icon,
}: ReservationCardFieldProps) {
  if (!value) return null
  return (
    <div className="min-w-0">
      <div
        className={`mb-[5px] text-[10px] font-extrabold uppercase text-content-faint ${centered ? 'text-center' : ''}`}
      >
        {label}
      </div>
      <div
        className={`min-h-[34px] rounded-[10px] bg-surface-muted px-2.5 py-2 text-[12.5px] font-semibold text-content ${Icon ? 'flex items-center gap-1.5' : '[overflow-wrap:anywhere]'} ${mono ? 'font-mono' : ''} ${centered ? 'text-center' : ''}`}
      >
        {Icon ? (
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
