'use client'

import { useActionState, useEffect, useRef } from 'react'

import { editUpdate, postUpdate, type PostUpdateState } from '@/app/actions/updates'
import { MentionTextarea } from '@/components/mention-textarea'
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

/** A creator, convention, or outlet an update can @-mention. `thumb` is a small
 *  square image URL, shown in the @ menu so near-duplicate names are legible. */
export type MentionOption = {
  id: string
  label: string
  group: 'creator' | 'convention' | 'media'
  thumb?: string | null
}

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
  /** Shown under the textarea once an @ is typed but before 3 letters land. */
  mentionHint: string
  mentionNoMatch: string
  mentionCreatorsGroup: string
  mentionConventionsGroup: string
  mentionMediaGroup: string
  submit: string
  success: string
}

/** An update being edited — the composer pre-fills from this and patches it. */
export type EditUpdate = { updateId: string; kind: string; body: string; mentionIds: string[] }

export function UpdateComposer({
  targets,
  kinds,
  mentions,
  labels,
  edit,
  onSuccess,
}: {
  targets: ComposerTarget[]
  kinds: readonly string[]
  mentions: MentionOption[]
  labels: ComposerLabels
  /** When set, the composer edits this update (target locked) instead of posting. */
  edit?: EditUpdate
  /** Fired once per successful submit — used to close the edit dialog + refresh. */
  onSuccess?: () => void
}) {
  const [state, action, pending] = useActionState(edit ? editUpdate : postUpdate, INITIAL)
  const creators = targets.filter((t) => t.group === 'creator')
  const comics = targets.filter((t) => t.group === 'comic')
  const editMentions = edit ? mentions.filter((m) => edit.mentionIds.includes(m.id)) : undefined

  // Fire onSuccess once per successful submit (guarded by the last-fired nonce,
  // so an unmemoized callback can't re-trigger it).
  const firedNonce = useRef(0)
  useEffect(() => {
    if (state.status === 'success' && state.nonce !== firedNonce.current) {
      firedNonce.current = state.nonce
      onSuccess?.()
    }
  }, [state.status, state.nonce, onSuccess])

  return (
    <div>
      <SectionHeading as="h2" size="sm">
        {labels.heading}
      </SectionHeading>
      <p className="text-foreground mb-5 max-w-prose text-sm">{labels.intro}</p>

      {/* Post mode keys by nonce to clear on success; edit mode uses a stable key
          (the dialog closes on success instead). */}
      <form key={edit ? 'edit' : state.nonce} action={action} className="max-w-prose space-y-4">
        {edit && <input type="hidden" name="updateId" value={edit.updateId} />}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Target is fixed when editing — an update is "about" its comic/creator. */}
          {!edit && (
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
          )}

          <div className="space-y-1.5">
            <label htmlFor="update-kind" className="block text-xs tracking-widest uppercase">
              {labels.kindLabel}
            </label>
            <select
              id="update-kind"
              name="kind"
              required
              defaultValue={edit?.kind ?? ''}
              className={fieldClass}
            >
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

        {/* The body + inline @-mentions. Type "@" and three letters to tag a
            creator, convention, or outlet; each becomes a chip whose id rides a
            hidden `mentions` input into the action, which validates the ids. */}
        <MentionTextarea
          name="body"
          defaultValue={edit?.body}
          placeholder={labels.placeholder}
          maxLength={BODY_LIMIT}
          options={mentions}
          initialSelected={editMentions}
          labels={labels}
        />

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
