'use client'

import { useActionState } from 'react'

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
  creatorsGroupLabel: string
  comicsGroupLabel: string
  kindLabel: string
  placeholder: string
  mentionsLabel: string
  mentionCreatorsGroup: string
  mentionConventionsGroup: string
  submit: string
  success: string
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
  const mentionCreators = mentions.filter((m) => m.group === 'creator')
  const mentionConventions = mentions.filter((m) => m.group === 'convention')

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
                —
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
            <select id="update-kind" name="kind" defaultValue={kinds[0]} className={fieldClass}>
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
            the feed. Checkboxes so it works without JS; the action validates ids. */}
        {mentions.length > 0 && (
          <fieldset className="space-y-2">
            <legend className="text-xs tracking-widest uppercase">{labels.mentionsLabel}</legend>
            <div className="max-h-44 space-y-3 overflow-y-auto border border-white/20 p-3">
              {mentionCreators.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-1.5 text-[10px] font-bold tracking-widest uppercase">
                    {labels.mentionCreatorsGroup}
                  </p>
                  <ul className="space-y-1">
                    {mentionCreators.map((m) => (
                      <li key={m.id}>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" name="mentions" value={m.id} className="accent-primary" />
                          {m.label}
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {mentionConventions.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-1.5 text-[10px] font-bold tracking-widest uppercase">
                    {labels.mentionConventionsGroup}
                  </p>
                  <ul className="space-y-1">
                    {mentionConventions.map((m) => (
                      <li key={m.id}>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" name="mentions" value={m.id} className="accent-primary" />
                          {m.label}
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </fieldset>
        )}

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
