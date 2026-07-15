/**
 * Local date/time string helpers for reservation presentation.
 *
 * TREK stores reservation and endpoint times as local wall-clock values. These
 * functions never turn them into JavaScript `Date` instants or apply timezone
 * conversion. A returned value is always `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm`.
 */

/** Splits a TREK ISO-like value into its local date and minute-precision time parts. */
export function splitLocalDateTime(value: string | null | undefined) {
  if (!value) return { date: '', time: '' }
  const [date = '', rawTime = ''] = value.split(/[T ]/)
  return { date, time: rawTime.slice(0, 5) }
}

/** Joins a local date and optional local time without inventing a midnight time. */
export function joinLocalDateTime(date: string | null | undefined, time: string | null | undefined) {
  return date ? `${date}${time ? `T${time.slice(0, 5)}` : ''}` : null
}

/** Formats a local calendar date for display while holding it in UTC to avoid day shifts. */
export function formatLocalDate(value: string | null | undefined) {
  if (!value) return ''
  try {
    return new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    })
  } catch {
    return value
  }
}

/** Formats a time-of-day string using the user's locale without deriving its date. */
export function formatLocalTime(value: string | null | undefined) {
  if (!value) return ''
  const [hours, minutes] = value.split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

/** Formats two local reservation boundaries into one compact schedule label. */
export function formatLocalSchedule(start: string | null, end: string | null) {
  const startValue = splitLocalDateTime(start)
  const endValue = splitLocalDateTime(end)
  const formattedStart = [formatLocalDate(startValue.date), formatLocalTime(startValue.time)]
    .filter(Boolean)
    .join(' · ')
  const formattedEnd = [
    endValue.date !== startValue.date ? formatLocalDate(endValue.date) : '',
    formatLocalTime(endValue.time),
  ]
    .filter(Boolean)
    .join(' · ')
  if (formattedStart && formattedEnd) return `${formattedStart} – ${formattedEnd}`
  return formattedStart || formattedEnd
}
