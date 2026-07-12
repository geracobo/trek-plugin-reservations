import { ExternalLink, Plus, Trash2 } from 'lucide-react'
import type { Cost } from '../types'

function formatCost(cost: Cost, fallbackCurrency: string) {
  const amount = Number(cost.total_price)
  if (!Number.isFinite(amount)) return '—'
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: (cost.currency || fallbackCurrency || 'EUR').toUpperCase(),
    }).format(amount)
  } catch {
    return `${amount} ${cost.currency || fallbackCurrency}`
  }
}

export function ReservationCostsSection({
  costs,
  currency,
  onCreate,
  onOpen,
  onRemove,
}: {
  costs: Cost[]
  currency?: string | null
  onCreate: () => void
  onOpen: (cost: Cost) => void
  onRemove: (cost: Cost) => void
}) {
  return (
    <section>
      <label className="mb-[6px] block text-[11px] font-semibold uppercase tracking-[0.03em] text-content-faint">
        Linked costs
      </label>
      <div className="flex flex-col gap-2">
        {costs.map((cost) => (
          <div
            key={cost.id}
            className="flex items-center gap-2.5 rounded-[10px] border border-edge bg-surface-secondary p-2.5"
          >
            <button type="button" onClick={() => onOpen(cost)} className="min-w-0 flex-1 text-left">
              <div className="truncate text-[13px] font-semibold text-content">{cost.name || 'Expense'}</div>
              <div className="text-[11px] text-content-faint">{cost.category || 'Other'}</div>
            </button>
            <span className="shrink-0 text-[13px] font-bold text-content">{formatCost(cost, currency || 'EUR')}</span>
            <button
              type="button"
              onClick={() => onOpen(cost)}
              title="Open in Costs"
              className="trek-btn trek-btn--ghost !min-h-8 !px-2"
            >
              <ExternalLink size={14} />
            </button>
            <button
              type="button"
              onClick={() => onRemove(cost)}
              title="Remove expense"
              className="trek-btn trek-btn--ghost !min-h-8 !px-2 text-danger"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={onCreate}
          className="trek-btn trek-btn--secondary flex w-full items-center justify-center gap-2 py-2.5 text-[13px]"
        >
          <Plus size={15} /> Create linked cost
        </button>
        {costs.length === 0 && (
          <p className="m-0 text-[11px] text-content-faint">
            Creates a planning cost with this reservation’s name and category.
          </p>
        )}
      </div>
    </section>
  )
}
