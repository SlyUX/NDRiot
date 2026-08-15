import type { ComposerLabels, MentionOption } from '@/components/update-composer'
import type { UpdateOwnerConfig } from '@/components/update-row'
import type { SiteSettings } from '@/lib/site-settings'
import { UPDATE_KINDS } from '@/lib/taxonomy'

/**
 * Build the update composer's labels from CMS copy — shared by the post surface
 * (/me) and the edit dialog. Server-safe (no 'use client'), so server pages can
 * assemble it and pass it to the client composer. The edit surface overrides the
 * `heading` and `submit` after calling this.
 */
export function composerLabelsFrom(s: SiteSettings['sections']): ComposerLabels {
  return {
    heading: s.accountPostHeading,
    intro: s.accountPostIntro,
    targetLabel: s.accountPostTargetLabel,
    targetPlaceholder: s.accountPostTargetPlaceholder,
    creatorsGroupLabel: s.accountPostCreatorsGroup,
    comicsGroupLabel: s.accountPostComicsGroup,
    kindLabel: s.accountPostKindLabel,
    kindPlaceholder: s.accountPostKindPlaceholder,
    placeholder: s.accountPostPlaceholder,
    mentionsLabel: s.accountPostMentionsLabel,
    mentionSearchPlaceholder: s.accountPostMentionSearch,
    mentionNoMatch: s.accountPostMentionNoMatch,
    mentionCreatorsGroup: s.accountPostMentionCreators,
    mentionConventionsGroup: s.accountPostMentionConventions,
    submit: s.accountPostSubmitLabel,
    success: s.accountPostSuccess,
  }
}

/**
 * The owner controls (edit + delete/undo) for a creator's own updates — passed
 * to `UpdateFeed`'s `owner` prop wherever an owner sees their updates (their
 * profile, their dashboard). The edit dialog reuses the post composer labels
 * with an "Edit"/"Save" heading + submit.
 */
export function updateOwnerConfig(
  s: SiteSettings['sections'],
  mentions: MentionOption[],
): UpdateOwnerConfig {
  return {
    deleteLabel: s.updateDeleteLabel,
    deletedLabel: s.updateDeletedLabel,
    undoLabel: s.updateUndoLabel,
    editLabel: s.updateEditLabel,
    editKinds: UPDATE_KINDS,
    editMentions: mentions,
    editLabels: { ...composerLabelsFrom(s), heading: s.updateEditLabel, submit: s.updateEditSubmit },
  }
}
