'use client'

import { useState } from 'react'

import { cn } from '@/lib/utils'

/**
 * Repeatable "left text + right URL" rows. Submits two parallel arrays
 * (`leftName`, `rightName`) an action zips by index. Used for creator work
 * links, adding an organization, and a media outlet's links (§4 — one
 * component, not three). Prepopulated from a loaded record where relevant;
 * falls back to one empty row. Without JS the rendered rows still submit — only
 * add/remove need it.
 */

const fieldClass =
  'focus-visible:ring-ring w-full border border-white/20 bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:outline-none'
const labelClass = 'block text-xs tracking-widest uppercase'
// Helper text is meant to be read, so it takes the full foreground (not muted).
const hintClass = 'text-foreground text-xs'

export function PairedRowsField({
  legend,
  hint,
  optionalLabel,
  leftName,
  leftPlaceholder,
  rightName,
  rightPlaceholder,
  rightDefault = '',
  addLabel,
  removeLabel,
  initial,
  hideLegend = false,
}: {
  legend: string
  hint?: string
  optionalLabel: string
  leftName: string
  leftPlaceholder: string
  rightName: string
  rightPlaceholder: string
  /** Prefill for the right (URL) column of a blank row, e.g. "https://www.". */
  rightDefault?: string
  addLabel: string
  removeLabel: string
  initial?: { left: string; right: string }[]
  /** Keep the legend for screen readers but hide it — when a wrapping
   *  disclosure (e.g. a collapsible summary) already shows the label. */
  hideLegend?: boolean
}) {
  const [rows, setRows] = useState<{ left: string; right: string; key: number }[]>(() =>
    (initial && initial.length ? initial : [{ left: '', right: rightDefault }]).map((r, i) => ({
      ...r,
      key: i,
    })),
  )

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      { left: '', right: rightDefault, key: prev.reduce((m, r) => Math.max(m, r.key), -1) + 1 },
    ])
  const removeRow = (key: number) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev))
  const update = (key: number, field: 'left' | 'right', value: string) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)))

  return (
    <fieldset className="space-y-3">
      <legend className={hideLegend ? 'sr-only' : labelClass}>
        {legend}
        <span className="text-muted-foreground ml-2 text-[0.65rem] tracking-wider normal-case">
          ({optionalLabel})
        </span>
      </legend>
      {hint && <p className={hintClass}>{hint}</p>}
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.key} className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              name={leftName}
              value={row.left}
              onChange={(e) => update(row.key, 'left', e.target.value)}
              placeholder={leftPlaceholder}
              aria-label={leftPlaceholder}
              className={cn(fieldClass, 'sm:w-1/3')}
            />
            <div className="flex gap-2 sm:flex-1">
              <input
                type="url"
                name={rightName}
                value={row.right}
                onChange={(e) => update(row.key, 'right', e.target.value)}
                placeholder={rightPlaceholder}
                aria-label={rightPlaceholder}
                className={cn(fieldClass, 'flex-1')}
              />
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  aria-label={removeLabel}
                  className="text-muted-foreground hover:text-primary focus-visible:ring-ring shrink-0 px-2 focus-visible:ring-2 focus-visible:outline-none"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addRow}
        className="text-primary focus-visible:ring-ring text-xs font-semibold tracking-widest uppercase focus-visible:ring-2 focus-visible:outline-none"
      >
        + {addLabel}
      </button>
    </fieldset>
  )
}
