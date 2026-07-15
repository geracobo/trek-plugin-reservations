export type CardFieldKey = 'tripDays' | 'schedule' | 'details' | 'location' | 'files' | 'notes'

export const CARD_FIELDS: Array<{ key: CardFieldKey; label: string }> = [
  { key: 'tripDays', label: 'Trip days' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'details', label: 'Details' },
  { key: 'location', label: 'Location & route' },
  { key: 'files', label: 'Files' },
  { key: 'notes', label: 'Notes' },
]

export const DEFAULT_CARD_FIELDS = new Set<CardFieldKey>(CARD_FIELDS.map((field) => field.key))
