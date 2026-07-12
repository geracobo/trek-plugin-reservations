import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, ChevronLeft, ChevronRight, Keyboard } from 'lucide-react'

type View = 'days' | 'months' | 'years'
const locale = typeof navigator === 'undefined' ? 'en' : navigator.language

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** TREK-style date field: calendar, month/year drill-down, typed date, and clear. */
export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  const parsed = value ? new Date(`${value}T00:00:00Z`) : null
  const [open, setOpen] = useState(false)
  const [typing, setTyping] = useState(false)
  const [text, setText] = useState('')
  const [view, setView] = useState<View>('days')
  const [year, setYear] = useState(parsed?.getUTCFullYear() || new Date().getFullYear())
  const [month, setMonth] = useState(parsed?.getUTCMonth() ?? new Date().getMonth())
  const [yearPage, setYearPage] = useState(Math.floor(year / 12) * 12)
  const triggerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    if (parsed) {
      setYear(parsed.getUTCFullYear())
      setMonth(parsed.getUTCMonth())
    }
    setView('days')
  }, [open]) // Selection is intentionally read when opening, as in TREK.

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      const target = event.target as Node
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const changeMonth = (delta: number) => {
    const next = new Date(year, month + delta, 1)
    setYear(next.getFullYear())
    setMonth(next.getMonth())
  }
  const submitText = () => {
    setTyping(false)
    const match = text.trim().match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
    if (match) onChange(`${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`)
  }
  const display = parsed?.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Date(2024, 0, index + 1).toLocaleDateString(locale, { weekday: 'narrow' }),
  )
  const monthLabel = new Date(year, month).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  const days = new Date(year, month + 1, 0).getDate()
  const offset = (new Date(year, month, 1).getDay() + 6) % 7
  const now = new Date()
  const position = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return { top: 0, left: 0 }
    const width = 268
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight
    return {
      top: Math.max(8, Math.min(rect.bottom + 4, viewportHeight - 368)),
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
    }
  }

  if (typing)
    return (
      <input
        autoFocus
        className="trek-input min-h-[38px] w-full text-[13px]"
        value={text}
        placeholder="YYYY-MM-DD"
        onChange={(event) => setText(event.target.value)}
        onBlur={submitText}
        onKeyDown={(event) => {
          if (event.key === 'Enter') submitText()
          if (event.key === 'Escape') setTyping(false)
        }}
      />
    )

  return (
    <div ref={triggerRef} className="relative flex items-center gap-1">
      <button
        type="button"
        className="flex min-h-[38px] min-w-0 flex-1 items-center justify-center gap-2 rounded-[10px] border border-edge bg-surface-input px-3.5 py-2 text-[13px] text-content"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
      >
        <Calendar size={14} className="shrink-0 text-content-faint" />
        <span className={display ? 'truncate' : 'truncate text-content-faint'}>{display || placeholder}</span>
      </button>
      <button
        type="button"
        className="flex shrink-0 items-center rounded-lg border border-edge p-[7px] text-content-faint hover:text-content"
        aria-label="Enter date manually"
        onClick={() => {
          setText(value)
          setTyping(true)
        }}
      >
        <Keyboard size={13} />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="dialog"
            className="w-[268px] max-w-[calc(100vw-16px)] rounded-[14px] border border-edge bg-surface-card p-3 shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
            style={{
              position: 'fixed',
              ...position(),
              zIndex: 99999,
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              animation: 'selectIn 0.15s ease-out',
            }}
          >
            <div className="mb-2.5 flex items-center justify-between">
              <button
                type="button"
                className="rounded-md p-1 text-content-faint hover:bg-surface-hover hover:text-content"
                aria-label="Previous"
                onClick={() =>
                  view === 'days'
                    ? changeMonth(-1)
                    : view === 'months'
                      ? setYear((current) => current - 1)
                      : setYearPage((current) => current - 12)
                }
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                className="rounded-md px-2 py-0.5 text-[13px] font-semibold text-content hover:bg-surface-hover"
                onClick={() =>
                  view === 'days'
                    ? setView('months')
                    : view === 'months' && (setYearPage(Math.floor(year / 12) * 12), setView('years'))
                }
              >
                {view === 'days' ? monthLabel : view === 'months' ? year : `${yearPage} – ${yearPage + 11}`}
              </button>
              <button
                type="button"
                className="rounded-md p-1 text-content-faint hover:bg-surface-hover hover:text-content"
                aria-label="Next"
                onClick={() =>
                  view === 'days'
                    ? changeMonth(1)
                    : view === 'months'
                      ? setYear((current) => current + 1)
                      : setYearPage((current) => current + 12)
                }
              >
                <ChevronRight size={16} />
              </button>
            </div>
            {view === 'days' && (
              <>
                <div className="mb-1 grid grid-cols-7 gap-0.5">
                  {weekdays.map((weekday, index) => (
                    <span key={index} className="py-0.5 text-center text-[10px] font-semibold text-content-faint">
                      {weekday}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                  {Array.from({ length: offset }, (_, index) => (
                    <span key={`blank-${index}`} />
                  ))}
                  {Array.from({ length: days }, (_, index) => {
                    const day = index + 1
                    const selected =
                      parsed?.getUTCFullYear() === year &&
                      parsed?.getUTCMonth() === month &&
                      parsed?.getUTCDate() === day
                    const today = now.getFullYear() === year && now.getMonth() === month && now.getDate() === day
                    return (
                      <button
                        key={day}
                        type="button"
                        className={`h-8 rounded-lg text-[12px] ${selected ? 'bg-accent font-bold text-white' : today ? 'font-semibold outline outline-2 outline-edge hover:bg-surface-hover' : 'hover:bg-surface-hover'}`}
                        onClick={() => {
                          onChange(isoDate(year, month, day))
                          setOpen(false)
                        }}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
            {view === 'months' && (
              <div className="grid grid-cols-3 gap-1">
                {Array.from({ length: 12 }, (_, index) => (
                  <button
                    key={index}
                    type="button"
                    className="rounded-lg px-1 py-2.5 text-[12px] hover:bg-surface-hover"
                    onClick={() => {
                      setMonth(index)
                      setView('days')
                    }}
                  >
                    {new Date(year, index).toLocaleDateString(locale, { month: 'short' })}
                  </button>
                ))}
              </div>
            )}
            {view === 'years' && (
              <div className="grid grid-cols-3 gap-1">
                {Array.from({ length: 12 }, (_, index) => (
                  <button
                    key={yearPage + index}
                    type="button"
                    className="rounded-lg px-1 py-2.5 text-[12px] hover:bg-surface-hover"
                    onClick={() => {
                      setYear(yearPage + index)
                      setView('months')
                    }}
                  >
                    {yearPage + index}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-2 flex justify-end">
              {value && (
                <button
                  type="button"
                  className="rounded-md px-2 py-1 text-[11px] text-content-faint hover:text-danger"
                  onClick={() => {
                    onChange('')
                    setOpen(false)
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
