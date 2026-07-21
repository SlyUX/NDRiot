'use client'

import { useCallback } from 'react'
import { PatchEvent, type FormPatch, type SlugInputProps } from 'sanity'

/**
 * Slug input that normalises what is actually stored, not just what is shown.
 *
 * A CSS `text-transform: lowercase` would be worse than no fix at all — the
 * field would read `fox-storytelling` while the document stored
 * `Fox-Storytelling`, so the bug would still ship but be invisible while
 * editing. This rewrites the patch value itself.
 *
 * Validation in `slugField.ts` stays as the backstop: it covers pasted values,
 * imports, and anything written through the API rather than this input.
 */

const normalize = (input: string): string =>
  input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/[\s-]+/g, '-')
    // Leading/trailing hyphens are NOT stripped here: doing so would fight the
    // editor mid-word, deleting the hyphen the moment they type it. The
    // slugify function and validation both handle the final value.
    .slice(0, 96)

export function LowercaseSlugInput(props: SlugInputProps) {
  const { onChange } = props

  // onChange accepts a single patch, an array, or a PatchEvent. Normalise to a
  // PatchEvent first so there is one shape to rewrite.
  const handleChange = useCallback(
    (incoming: FormPatch | PatchEvent | FormPatch[]) => {
      onChange(
        PatchEvent.from(
          PatchEvent.from(incoming).patches.map((patch) => {
            if (patch.type !== 'set') return patch

            // Sanity patches the slug either as a bare string at the `current`
            // path, or as the whole { _type, current } object. Handle both.
            if (typeof patch.value === 'string') {
              return { ...patch, value: normalize(patch.value) }
            }

            if (
              patch.value &&
              typeof patch.value === 'object' &&
              'current' in patch.value &&
              typeof patch.value.current === 'string'
            ) {
              return {
                ...patch,
                value: { ...patch.value, current: normalize(patch.value.current) },
              }
            }

            return patch
          }),
        ),
      )
    },
    [onChange],
  )

  return props.renderDefault({ ...props, onChange: handleChange })
}
