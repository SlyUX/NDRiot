'use client'

import { useActionState, useState } from 'react'

import { postUpdate, type PostUpdateState } from '@/app/actions/updates'
import { SectionHeading } from '@/components/section-heading'
import { Button } from '@/components/ui/button'

/**
 * The creator's update composer, on /me. Presentational — every label comes
 * from Sanity (§2); the ownership-gated posting lives in the `postUpdate`
 * Server Action.
 *
 * A plain <form action={…}> so it works without JavaScript; useActionState
 * upgrades it with a pending state and inline messages once hydrated. The form
 * is keyed on the action's `nonce`, which bumps only on a successful post, so a
 * success clears the fields while an error leaves what was typed intact.
 */
const INITIAL: PostUpdateState = { status: 'idle', nonce: 0 }
const BODY_LIMIT = 200

const fieldClass =
  'focus-visible:ring-ring w-full border border-white/20 bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:outline-none'

/** A creator or comic the signed-in owner can post about. */
export type ComposerTarget = { id: string; label: string; group: 'creator' | 'comic' }

/** A creator or convention an update can reference. */
export type MentionOption = { id: string; label: string; group: 'creator' | 'convention' }

export type ComposerLabels = {
  heading: string
  intro: string
  targetLabel: string
  targetPlaceholder: string
  creatorsGroupLabel: string
  comicsGroupLabel: string
  kindLabel: string
  kindPlaceholder: string
  placeholder: string
  mentionsLabel: string
  mentionSearchPlaceholder: string
  mentionNoMatch: string
  mentionCreatorsGroup: string
  mentionConventionsGroup: string
  submit: string
  success: string
}

const groupHeadingClass =
  'text-muted-foreground mb-1.5 text-[10px] font-bold tracking-widest uppercase'
const optionClass =
  'hover:bg-primary/10 hover:text-primary focus-visible:bg-primary/10 block w-full px-2 py-1 text-left text-sm focus-visible:outline-none'

/**
 * Searchable multi-select for the update's references. Creators and conventions
 * share one control (grouped in the results), so it scales to long lists — the
 * results only render once you type. Selected items become removable chips
 * backed by hidden inputs named `mentions`, so the plain form action still
 * receives them. Remounts (and clears) with the form on a successful post.
 */
function MentionPicker({
  options,
  labels,
}: {
  options: MentionOption[]
  labels: Pick<
    ComposerLabels,
    'mentionsLabel' | 'mentionSearchPlaceholder' | 'mentionNoMatch' | 'mentionCreatorsGroup' | 'mentionConventionsGroup'
  >
}) {
  const [selected, setSelected] = useState<MentionOption[]>([])
  const [query, setQuery] = useState('')

  const selectedIds = new Set(selected.map((option) => option.id))
  const q = query.trim().toLowerCase()
  const matches = q
    ? options.filter((option) => !selectedIds.has(option.id) && option.label.toLowerCase().includes(q))
    : []
  const creators = matches.filter((option) => option.group === 'creator').slice(0, 25)
  const conventions = matches.filter((option) => option.group === 'convention').slice(0, 25)

  const add = (option: MentionOption) => {
    setSelected((prev) => [...prev, option])
    setQuery('')
  }
  const remove = (id: string) => setSelected((prev) => prev.filter((option) => option.id !== id))

  return (
    <div className="space-y-2">
      <span className="block text-xs tracking-widest uppercase">{labels.mentionsLabel}</span>

      {/* The selection, carried into the form action. */}
      {selected.map((option) => (
        <input key={option.id} type="hidden" name="mentions" value={option.id} />
      ))}

      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {selected.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => remove(option.id)}
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground focus-visible:ring-ring inline-flex items-center gap-1 border px-2 py-0.5 text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                {option.label}
                <span aria-hidden="true">×</span>
                <span className="sr-only">— remove</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          // Enter in a field inside the form would post the update; instead add
          // the top match (or just swallow it).
          if (event.key === 'Enter') {
            event.preventDefault()
            const top = creators[0] ?? conventions[0]
            if (top) add(top)
          }
        }}
        placeholder={labels.mentionSearchPlaceholder}
        autoComplete="off"
        className={fieldClass}
      />

      {q !== '' &&
        (creators.length > 0 || conventions.length > 0 ? (
          <div className="max-h-44 space-y-3 overflow-y-auto border border-white/20 p-3">
            {creators.length > 0 && (
              <div>
                <p className={groupHeadingClass}>{labels.mentionCreatorsGroup}</p>
                <ul>
                  {creators.map((option) => (
                    <li key={option.id}>
                      <button type="button" onClick={() => add(option)} className={optionClass}>
                        {option.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {conventions.length > 0 && (
              <div>
                <p className={groupHeadingClass}>{labels.mentionConventionsGroup}</p>
                <ul>
                  {conventions.map((option) => (
                    <li key={option.id}>
                      <button type="button" onClick={() => add(option)} className={optionClass}>
                        {option.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">{labels.mentionNoMatch}</p>
        ))}
    </div>
  )
}

export function UpdateComposer({
  targets,
  kinds,
  mentions,
  labels,
}: {
  targets: ComposerTarget[]
  kinds: readonly string[]
  mentions: MentionOption[]
  labels: ComposerLabels
}) {
  const [state, action, pending] = useActionState(postUpdate, INITIAL)
  const creators = targets.filter((t) => t.group === 'creator')
  const comics = targets.filter((t) => t.group === 'comic')

  return (
    <div>
      <SectionHeading as="h2" size="sm">
        {labels.heading}
      </SectionHeading>
      <p className="text-muted-foreground mb-5 max-w-prose text-sm">{labels.intro}</p>

      {/* key={state.nonce} clears the fields after a successful post (nonce bumps
          only on success); an error leaves the draft untouched. */}
      <form key={state.nonce} action={action} className="max-w-prose space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="update-target" className="block text-xs tracking-widest uppercase">
              {labels.targetLabel}
            </label>
            <select id="update-target" name="targetId" required defaultValue="" className={fieldClass}>
              <option value="" disabled>
                {labels.targetPlaceholder}
              </option>
              {creators.length > 0 && (
                <optgroup label={labels.creatorsGroupLabel}>
                  {creators.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </optgroup>
              )}
              {comics.length > 0 && (
                <optgroup label={labels.comicsGroupLabel}>
                  {comics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="update-kind" className="block text-xs tracking-widest uppercase">
              {labels.kindLabel}
            </label>
            <select id="update-kind" name="kind" required defaultValue="" className={fieldClass}>
              <option value="" disabled>
                {labels.kindPlaceholder}
              </option>
              {kinds.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
        </div>

        <textarea
          name="body"
          required
          rows={3}
          maxLength={BODY_LIMIT}
          placeholder={labels.placeholder}
          className={`${fieldClass} resize-y`}
        />

        {/* Optional references to other creators/conventions, shown as links in
            the feed. Searchable so it scales; the action validates ids. */}
        {mentions.length > 0 && <MentionPicker options={mentions} labels={labels} />}

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={pending} className="font-black tracking-wide uppercase">
            {labels.submit}
          </Button>
          {state.status === 'success' && (
            <p role="status" className="text-funding text-sm font-bold">
              {labels.success}
            </p>
          )}
          {state.status === 'error' && (
            <p role="alert" className="text-destructive text-sm">
              {state.message}
            </p>
          )}
        </div>
      </form>
    </div>
  )
}
