import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'

export interface TripDayOption {
  value: string
  label: string
  badge?: string
  isHeader?: boolean
  searchLabel?: string
  groupLabel?: string
}

interface TripDaySelectProps {
  value: string
  onChange: (value: string) => void
  options: TripDayOption[]
  placeholder?: string
  searchable?: boolean
}

/**
 * TREK presents trip days as its custom menu control, rather than a native
 * select. Keeping this dedicated makes the day contract explicit and avoids
 * accidentally using it for unrelated enum fields.
 */
export function TripDaySelect({
  value,
  onChange,
  options,
  placeholder = 'Select day',
  searchable = false,
}: TripDaySelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const triggerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const selected = options.find((option) => option.value === value)

  useEffect(() => {
    if (!open) return
    const closeOnOutsidePress = (event: MouseEvent) => {
      const target = event.target as Node
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsidePress)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsidePress)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  useEffect(() => {
    if (open && searchable) searchRef.current?.focus()
  }, [open, searchable])

  const position = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return { top: 0, left: 0, width: 200 }
    const spaceBelow = window.innerHeight - rect.bottom
    const openUp = spaceBelow < 220 && rect.top > spaceBelow
    return openUp
      ? { bottom: window.innerHeight - rect.top + 4, left: rect.left, width: rect.width }
      : { top: rect.bottom + 4, left: rect.left, width: rect.width }
  }
  const visibleOptions = (() => {
    if (!searchable || !search.trim()) return options
    const query = search.trim().toLowerCase()
    const result: TripDayOption[] = []
    let header: TripDayOption | null = null
    let headerIncluded = false
    for (const option of options) {
      if (option.isHeader) {
        header = option
        headerIncluded = false
        continue
      }
      if (
        [option.label, option.searchLabel, option.groupLabel].filter(Boolean).join(' ').toLowerCase().includes(query)
      ) {
        if (header && !headerIncluded) result.push(header)
        headerIncluded = true
        result.push(option)
      }
    }
    return result
  })()

  return (
    <div ref={triggerRef} className="relative">
      <button
        type="button"
        className="flex min-h-[38px] w-full items-center gap-2 rounded-[10px] border border-edge bg-surface-input px-3 py-2 text-left text-[13px] font-medium text-content"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => {
          setOpen((current) => !current)
          setSearch('')
        }}
      >
        <span className={selected ? 'min-w-0 flex-1 truncate' : 'min-w-0 flex-1 truncate text-content-faint'}>
          {selected?.label || placeholder}
        </span>
        {selected?.badge && (
          <span className="shrink-0 rounded-full bg-surface-muted px-[7px] py-[2px] text-[10px] font-semibold tracking-[0.01em] text-content-secondary">
            {selected.badge}
          </span>
        )}
        <ChevronDown
          size={14}
          className={`shrink-0 text-content-faint transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="overflow-hidden rounded-[10px] border border-edge bg-surface-card shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
            role="listbox"
            style={{
              position: 'fixed',
              ...position(),
              zIndex: 99999,
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              animation: 'trek-menu-enter 200ms cubic-bezier(0.23, 1, 0.32, 1)',
            }}
          >
            {searchable && (
              <div className="p-1 pb-0">
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search…"
                  className="trek-input min-h-8 w-full text-[12px]"
                />
              </div>
            )}
            <div className="max-h-[220px] overflow-y-auto p-1">
              {visibleOptions.map((option) => {
                if (option.isHeader)
                  return (
                    <div key={option.value} className="px-2.5 pt-2 pb-1 text-[11px] font-semibold text-content-muted">
                      {option.label}
                    </div>
                  )
                const isSelected = option.value === value
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`flex w-full items-center gap-2 rounded-md px-2.5 py-[7px] text-left text-[13px] text-content hover:bg-surface-hover ${isSelected ? 'bg-surface-hover' : ''}`}
                    onClick={() => {
                      onChange(option.value)
                      setOpen(false)
                    }}
                  >
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {option.badge && (
                      <span className="shrink-0 rounded-full bg-surface-muted px-[7px] py-[2px] text-[10px] font-semibold tracking-[0.01em] text-content-secondary">
                        {option.badge}
                      </span>
                    )}
                    {isSelected && <Check size={13} className="shrink-0 text-content-secondary" />}
                  </button>
                )
              })}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
