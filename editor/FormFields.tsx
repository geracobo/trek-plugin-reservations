import type { ReactNode } from 'react'

export const inputClass = 'trek-input min-h-[38px] w-full text-[13px]'
export const labelClass = 'mb-[5px] block text-[11px] font-semibold uppercase tracking-[0.03em] text-content-faint'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  )
}
