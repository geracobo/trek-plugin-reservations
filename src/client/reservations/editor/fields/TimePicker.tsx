import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, ChevronUp, Clock } from 'lucide-react'

function clamp(value: number, max: number) {
  return Math.max(0, Math.min(max, value))
}

function parseStoredTime(value: string | undefined) {
  const match = (value || '').match(/^(\d{1,2}):(\d{1,2})$/)
  if (!match) return { hour: null, minute: null }
  const rawHour = Number(match[1])
  const rawMinute = Number(match[2])
  return {
    hour: Number.isFinite(rawHour) ? clamp(rawHour, 23) : null,
    minute: Number.isFinite(rawMinute) ? clamp(rawMinute, 59) : null,
  }
}

function format12Hour(value: string) {
  const { hour, minute } = parseStoredTime(value)
  if (hour === null || minute === null) return value
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`
}

/** TREK-style time field: 12-hour typed input plus five-minute stepper menu. */
export function TimePicker({
  value,
  onChange,
  placeholder = '2:30 PM',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const [text, setText] = useState(() => format12Hour(value))
  const triggerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const { hour, minute } = parseStoredTime(value)
  const update = (nextHour: number, nextMinute: number) =>
    onChange(`${String(clamp(nextHour, 23)).padStart(2, '0')}:${String(clamp(nextMinute, 59)).padStart(2, '0')}`)
  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      const target = event.target as Node
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  useEffect(() => {
    if (!focused) setText(format12Hour(value))
  }, [focused, value])
  const normalize = (rawValue: string) => {
    const raw = rawValue.trim()
    if (!raw) return
    const twelveHour = raw.match(/^(\d{1,2}):?(\d{2})?\s*(am|pm)$/i)
    if (twelveHour) {
      let nextHour = Number(twelveHour[1])
      const nextMinute = twelveHour[2] ? Number(twelveHour[2]) : 0
      const isPm = twelveHour[3].toLowerCase() === 'pm'
      if (nextHour === 12) nextHour = isPm ? 12 : 0
      else if (isPm) nextHour += 12
      update(nextHour, nextMinute)
      return
    }
    const digits = raw.replace(/[^0-9]/g, '')
    if (/^\d{1,2}:\d{2}$/.test(raw)) {
      const [nextHour, nextMinute] = raw.split(':').map(Number)
      update(nextHour, nextMinute)
    } else if (/^\d{3,4}$/.test(digits)) update(Number(digits.slice(0, -2)), Number(digits.slice(-2)))
    else if (/^\d{1,2}$/.test(digits)) update(Number(digits), 0)
  }
  const pos = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    return rect ? { top: Math.min(rect.bottom + 4, window.innerHeight - 160), left: rect.left } : { top: 0, left: 0 }
  }
  const step = (unit: 'hour' | 'minute', direction: number) => {
    if (unit === 'hour') update(((hour ?? (direction > 0 ? -1 : 1)) + direction + 24) % 24, minute ?? 0)
    else {
      const currentMinute = minute ?? (direction > 0 ? -5 : 5)
      const nextMinute = (currentMinute + direction * 5 + 60) % 60
      update(
        (hour ?? 0) +
          (direction > 0 && nextMinute < currentMinute ? 1 : direction < 0 && nextMinute > currentMinute ? -1 : 0),
        nextMinute,
      )
    }
  }
  const arrow = (unit: 'hour' | 'minute', direction: number) => (
    <button
      type="button"
      className="rounded p-0.5 text-content-faint hover:text-content"
      onClick={() => step(unit, direction)}
    >
      {direction > 0 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
    </button>
  )
  const togglePeriod = () => update(hour === null || hour < 12 ? (hour ?? 0) + 12 : hour - 12, minute ?? 0)
  return (
    <div ref={triggerRef} className="relative">
      <div className="flex min-h-[38px] w-full items-center overflow-hidden rounded-[10px] border border-edge bg-surface-input">
        <input
          className="min-w-0 flex-1 border-0! bg-transparent px-3.5 py-2 text-[13px] text-content! shadow-none! outline-none! focus:border-0! focus:shadow-none! focus:outline-none!"
          value={text}
          placeholder={placeholder}
          onChange={(event) => setText(event.target.value)}
          onFocus={() => {
            setText(format12Hour(value))
            setFocused(true)
          }}
          onBlur={() => {
            setFocused(false)
            normalize(text)
          }}
        />
        <button
          type="button"
          className="p-2.5 text-content-faint hover:text-content"
          aria-label="Choose time"
          onClick={() => setOpen((current) => !current)}
        >
          <Clock size={14} />
        </button>
      </div>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="flex items-center gap-1.5 rounded-xl border border-edge bg-surface-card p-3 shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
            style={{
              position: 'fixed',
              ...pos(),
              zIndex: 99999,
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              animation: 'selectIn 0.15s ease-out',
            }}
          >
            <div className="flex flex-col items-center">
              {arrow('hour', 1)}
              <span className="flex h-10 w-11 items-center justify-center rounded-lg bg-surface-hover text-[22px] font-bold tabular-nums text-content">
                {hour === null ? '--' : String(hour === 0 ? 12 : hour > 12 ? hour - 12 : hour)}
              </span>
              {arrow('hour', -1)}
            </div>
            <span className="text-[22px] font-bold text-content-faint">:</span>
            <div className="flex flex-col items-center">
              {arrow('minute', 1)}
              <span className="flex h-10 w-11 items-center justify-center rounded-lg bg-surface-hover text-[22px] font-bold tabular-nums text-content">
                {minute === null ? '--' : String(minute).padStart(2, '0')}
              </span>
              {arrow('minute', -1)}
            </div>
            <div className="ml-1 flex flex-col items-center">
              <button
                type="button"
                className="rounded p-0.5 text-content-faint hover:text-content"
                onClick={togglePeriod}
              >
                <ChevronUp size={16} />
              </button>
              <button
                type="button"
                className="flex h-10 w-9 items-center justify-center rounded-lg bg-surface-hover text-[14px] font-bold text-content"
                onClick={togglePeriod}
              >
                {hour !== null && hour >= 12 ? 'PM' : 'AM'}
              </button>
              <button
                type="button"
                className="rounded p-0.5 text-content-faint hover:text-content"
                onClick={togglePeriod}
              >
                <ChevronDown size={16} />
              </button>
            </div>
            {value && (
              <button
                type="button"
                className="ml-1 rounded px-1.5 text-[11px] text-content-faint hover:text-danger"
                onClick={() => {
                  onChange('')
                  setOpen(false)
                }}
              >
                ✕
              </button>
            )}
          </div>,
          document.body,
        )}
    </div>
  )
}
