'use client'

import { set, unset, type ArrayOfPrimitivesInputProps } from 'sanity'

/**
 * An array-of-strings input that adds a "Select all / Clear all" toggle above
 * Sanity's native checkbox list.
 *
 * Sanity ships no select-all, and a list that is a dozen checkboxes is tedious
 * to tick one at a time — this covers the common "they cover everything" case
 * in a single click, then leaves the native checkboxes to do the rest.
 *
 * Generic on purpose: the option list is read from the field's own schema
 * (`of[0].options.list`), so this works for any array-of-string list field, not
 * just genres. It relies on the field NOT setting `options.layout: 'grid'`, so
 * the default renders as labelled checkboxes rather than a tag grid.
 */

type ListItem = string | { title?: string; value: string }

export function CheckboxSelectAllInput(props: ArrayOfPrimitivesInputProps) {
  const { onChange, schemaType, readOnly } = props
  const value = (props.value ?? []) as string[]

  const list =
    (schemaType.of?.[0] as unknown as { options?: { list?: ListItem[] } })?.options?.list ?? []
  const allValues = list.map((item) => (typeof item === 'string' ? item : item.value))
  const allSelected = allValues.length > 0 && allValues.every((v) => value.includes(v))

  const toggleAll = () => onChange(allSelected ? unset() : set(allValues))

  return (
    <div>
      {allValues.length > 0 && (
        <button
          type="button"
          onClick={toggleAll}
          disabled={readOnly}
          style={{
            marginBottom: 10,
            padding: '4px 10px',
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.03em',
            color: 'inherit',
            background: 'transparent',
            border: '1px solid var(--card-border-color, rgba(255,255,255,0.2))',
            borderRadius: 3,
            cursor: readOnly ? 'default' : 'pointer',
            opacity: readOnly ? 0.5 : 1,
          }}
        >
          {allSelected ? 'Clear all' : 'Select all'}
        </button>
      )}
      {props.renderDefault(props)}
    </div>
  )
}
