# Content intake strategy

Status: **direction, not a commitment.** Nothing here is built. It exists so
today's schema decisions don't paint us into a corner, and so we recognise the
moment each stage becomes worth building.

Last reviewed: 2026-07-21.

---

## The principle

**Sanity is canonical. A form is an intake buffer, never a content source.**

Content is only real once it is a Sanity document. Everything upstream — a
Google Form, a spreadsheet, an email — is a staging area whose entire job is to
make the mapping into Sanity cheap. If we ever find ourselves treating the
spreadsheet as the source of truth, something has gone wrong.

## The hard part

**Forms produce flat text. Our content is relational.**

- A book references a creator.
- A creator references a studio and up to three organizations.
- A genre is free text that must match existing spellings exactly.

A form field containing `"Nash Illustrators"` is not a reference. Something has
to decide whether it means the existing `nash-illustrators` document, or a new
organization. That decision needs judgement, or a good fuzzy match plus a human
confirming it.

This is the same class of problem that made us choose reference types over free
text in the first place. A form re-opens it at the boundary. **Design the form
to narrow the guesswork**, and the reconciliation stays cheap:

- Ask for organizations as a **dropdown of known values**, not a text field,
  with an "other — tell us" escape hatch. Maintaining that list by hand is
  much cheaper than deduplicating records later.
- Ask for genres the same way. Free-text genres are how `/categories/Sci-Fi`
  and `/categories/Science Fiction` become two pages.
- Ask for the creator on a **book** form as a dropdown of existing creators,
  so the book-to-creator link is unambiguous. A creator must exist before
  their books do.

## Stages

Move to the next stage when the trigger fires, not before.

### Stage 1 — Form, then manual entry (start here)

Google Form → a human reads responses → types into `/studio`.

Zero build. Works comfortably to a few dozen creators. The team sees every
submission, so quality control and reference matching are free side effects of
doing the entry.

**Trigger to move on:** manual entry becomes the bottleneck on growth, or the
same person is retyping the same fields more than a few times a week.

### Stage 2 — Import script producing drafts

Sheet → script → **draft** Sanity documents → team reviews and publishes.

The script never publishes. It creates drafts, which means Sanity's existing
draft/publish split *is* the approval queue — no `status` field, no custom
workflow, no new UI.

Reference matching is the script's real work: exact match on organization name,
fall back to flagging for a human rather than silently creating a duplicate.
Failing loudly is the whole point.

**Trigger to move on:** creators want to update their own pages without waiting
on us, or submissions outpace review.

### Stage 3 — Self-serve intake

A form on ndriot.com writing directly to Sanity as drafts, via a server action
and a write token.

Produces correctly-shaped drafts with real references, because the form can
query Sanity for live dropdown options rather than a hand-maintained list. No
reconciliation step at all.

Costs: a write token that must never reach the client, spam protection, and
image upload handling. Only worth it once self-serve is genuinely the goal.

### Stage 4 — Studio access per creator

Probably never for most creators, and it needs the ownership model
(see "Open questions"). Plausible for a handful of trusted studios.

---

## Separate forms per entity

Yes — the cadences differ.

| Form | Frequency | Notes |
|---|---|---|
| Creator | Once per person | Gates everything else; must come first. |
| Studio / Organization | Rarely | Often shared. Usually we create these, not the creator. |
| Book | Repeatedly | One submission per book. Design for a creator filing five. |

A creator submitting several books should not re-enter their bio each time.

## What the forms must ask that is easy to forget

- **Alt text, asked separately from the description.** "Describe your cover
  image for someone who cannot see it" is a different question from "describe
  your book," and if we only ask the second we get marketing copy in the alt
  field. This has already happened once.
- **Permission to publish.** We are reproducing cover art and photos. The form
  is where consent is captured — explicitly, with a record of who agreed and
  when. This is the one item here that is not merely operational.
- **Image links rather than uploads**, at Stage 1. A URL we can fetch is easier
  to handle than a Drive attachment with sharing permissions.
- **How they want to be credited**, which may not be their legal name.
- **Their preferred slug**, or we derive it. Worth asking, since it is the one
  field that is expensive to change after launch.

## Approval

Sanity's draft/publish split already models this. A submission becomes a draft;
publishing is approval. Resist adding a parallel `status` field — two sources of
truth for "is this live" is how content states get out of sync.

## Open questions

- **Ownership.** Nothing currently links a Sanity user to a creator document.
  A creator record today *describes* a person; it does not *belong to* one.
  Stage 3 and 4 both need that link. Adding it later means revisiting every
  profile — cheap at one creator, not at fifty. Worth deciding before the
  roster grows, even if we do not build on it yet.
- **Edits vs. submissions.** A creator updating their bio is a different flow
  from a creator joining. Stage 2 handles new records well and updates badly.
- **Who owns a studio's page** when the studio has several members.
