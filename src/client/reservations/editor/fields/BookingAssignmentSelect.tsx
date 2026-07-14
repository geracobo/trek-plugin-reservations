import { Link2 } from 'lucide-react'
import type { Day } from '../../types'
import { Field } from './FormFields'
import { TripDaySelect, type TripDayOption } from './TripDaySelect'

function dayLabel(day: Day) {
  return day.title || `Day ${day.day_number || ''}`.trim()
}

function assignmentOptions(days: Day[]): TripDayOption[] {
  return days.flatMap((day) => {
    const assignments = Array.isArray(day.assignments) ? day.assignments : []
    const items = assignments.flatMap((assignment, index) => {
      if (!assignment || typeof assignment !== 'object') return []
      const item = assignment as Record<string, unknown>
      const id = Number(item.id)
      const place = item.place && typeof item.place === 'object' ? (item.place as Record<string, unknown>) : null
      const placeName = typeof place?.name === 'string' ? place.name : null
      if (!Number.isInteger(id) || !placeName) return []
      const dayLabel = day.title || `Day ${day.day_number || ''}`.trim()
      const time = typeof place?.place_time === 'string' ? ` · ${place.place_time}` : ''
      return [
        {
          value: String(id),
          label: `${index + 1}. ${placeName}${time}`,
          searchLabel: placeName,
          groupLabel: dayLabel,
          badge: day.date || undefined,
        },
      ]
    })
    if (items.length === 0) return []
    const date = day.date
      ? ` · ${new Date(`${day.date}T00:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' })}`
      : ''
    return [{ value: `_header_${day.id}`, label: `${dayLabel(day)}${date}`, isHeader: true }, ...items]
  })
}

export function BookingAssignmentSelect({
  days,
  value,
  onChange,
}: {
  days: Day[]
  value: string
  onChange: (assignmentId: string, dayDate: string | null) => void
}) {
  const options = assignmentOptions(days)
  if (options.length === 0) return null
  return (
    <Field
      label={
        <span className="inline-flex items-center gap-1">
          <Link2 size={10} /> Link to day assignment
        </span>
      }
    >
      <TripDaySelect
        value={value}
        placeholder="No assignment"
        searchable
        options={[{ value: '', label: 'No assignment' }, ...options]}
        onChange={(assignmentId) => {
          const selected = days
            .flatMap((day) =>
              (Array.isArray(day.assignments) ? day.assignments : []).map((assignment) => ({ day, assignment })),
            )
            .find(({ assignment }) => String((assignment as { id?: number })?.id) === assignmentId)
          onChange(assignmentId, selected?.day.date || null)
        }}
      />
    </Field>
  )
}
