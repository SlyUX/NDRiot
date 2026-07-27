# Native intake + creator ownership — implementation brief

Status: **direction agreed, not scheduled.** This records the plan for reaching
"Stage 3" of the intake strategy — on-site forms that write Sanity review drafts
directly — and the **Google sign-in ownership model** that unblocks self-serve
editing. It is the implementation companion to [`content-intake.md`](content-intake.md),
which sets the strategy this builds. Nothing here is started.

Last reviewed: 2026-07-27.

---

## Goal

Replace the two Google Forms (creator intake, book intake) with forms on
ndriot.com that write **review drafts** straight into Sanity, and let a creator
sign in with Google to edit **only their own** profile and books.

## The headline finding

**~70% of this already exists in the repo.** The intake logic lives in the
import scripts; the form-plus-server-action pattern (with anti-spam) lives in the
contact form; the write token is provisioned; the schemas and form briefs spec
every field. The genuinely new work is four things: (1) a server-side write
boundary, (2) browser file uploads, (3) Google auth, (4) a private ownership
map. None of it is algorithm design — it is re-hosting existing logic plus two
well-trodden integrations.

## Principles (inherited from content-intake.md, non-negotiable)

- **Sanity is canonical.** A submission becomes a review **draft**, never live
  content, never an auto-publish. Sanity's draft/publish split *is* the approval
  queue — no parallel `status` field.
- **The write token must never reach the client.** Every write sits behind
  `'use server'` / `import 'server-only'`.
- **No PII in the public dataset.** Production is world-readable; creator emails
  are deliberately not stored in Sanity. The ownership map must honour this (see
  Part 2).
- **§3.** No ranking, no inference, human approval before anything goes public.

---

## Part 1 — Native intake (Stage 3)

### Reuse — already built

- **Form + server-action pattern:** `src/components/contact-form.tsx` +
  `src/app/actions/contact.ts`. Already includes working anti-spam — off-screen
  honeypot, a mount-time timing gate (submit under ~2s → silent fake success),
  a per-IP rate limit, and env-gating. A native intake form is this shape scaled
  up. (One divergence: the contact action deliberately does *not* write to
  Sanity because a stranger's message would become world-readable; an intake
  action *does* write, but only a draft of content meant to be published.)
- **Mapping / dedup / upload logic:** `scripts/import-creators.mjs`,
  `scripts/import-books.mjs`, `scripts/lib/shared.mjs`, `scripts/lib/sanity.mjs`.
  Field→schema mapping, taxonomy matching (parsed live from `src/lib/taxonomy.ts`
  so it never drifts), organization/creator reference resolution, the
  update-vs-new logic, the "Can we publish this?" gate, and authenticated image
  upload to Sanity's assets endpoint. Port to a shared TS module the action and
  (optionally) the scripts both import.
- **Write token:** `loadToken()` reads `SANITY_WRITE_TOKEN` / `CREATOR_SCRIPT`;
  `.env.local` holds `CREATOR_SCRIPT` (populated, mirrored in Vercel).
- **Schemas + field lists:** `creator.ts`, `book.ts`, `organization.ts`,
  `bookLink.ts`, `socialLink.ts`, `imageWithAlt.ts`, plus
  `docs/creator-intake-form-brief.md` and `docs/book-intake-form-brief.md` —
  every question, option list, and required/optional status is already spec'd.

### New work

- **A `server-only` write client** holding the token, used *only* inside server
  actions. The app today has **zero** write capability — `src/sanity/client.ts`
  is the only client, `useCdn: true`, no token. This is the first server-side
  write and the main new security surface.
- **Browser file uploads (multipart).** Files arrive as `File` in `FormData`,
  POSTed to Sanity's assets endpoint (the mechanism `sanity.mjs`'s
  `uploadImage` already proves). This **eliminates the Google Drive problem** —
  no more private-Drive links the importer can't read, no attach-by-hand in the
  Studio. New: size/content-type validation and wiring alt text (asked
  separately from the description).
- **Live dropdowns emitting `label + id`.** Forms query Sanity at render for
  creators / organizations / genres and submit the document `_id` directly —
  which closes the identity-matching gap the whole "Updates" section of
  content-intake.md was written to work around, and retires both Apps Scripts.

### What gets deleted or easier

- Both dropdown-sync Apps Scripts (`scripts/apps-script/*.gs`) and their daily
  triggers.
- The Drive-fetch problem (`normaliseDriveUrl` / `driveNote` in `sanity.mjs`).
- The CSV round-trip (`parseCsv`, `repairText` Latin-1 repair, the `--commit`
  step).
- Instant drafts instead of waiting on an importer run.
- **Keep the book back-catalogue CSV importer** regardless — it exists because
  nobody fills a form fifteen times (see the book form brief).

---

## Part 2 — Ownership via Google sign-in (unblocks self-serve edits)

### The decision

Use **Google OAuth (Auth.js / NextAuth), strictly for identity validation** —
delegate identity to Google, manage no passwords or accounts. Creators already
use Google for their files, so friction is near zero. It also does double duty:
**gating the intake forms behind a Google login removes most of the spam risk.**

### The distinction that matters

**Login proves *who* someone is (a verified Google email). It does not say
*which* creator they own.** Ownership is the *link* between that email and a
specific creator document. Two pieces:

1. **Auth** (Google) — mostly boilerplate.
2. **The ownership link** (email → `creatorId`) — the real design.

### The privacy constraint and its solution

The email→creator map **cannot live in the public Sanity dataset** — that would
leak the email and break the no-PII principle. Store it privately. Two viable
homes, an ops choice to settle before building:

- **A private Sanity dataset** (separate from `production`, read server-side
  with a token), or
- **A small server-side key-value / DB store** (e.g. Vercel KV, Upstash,
  Postgres).

This is a deliberate private store — **not** an `ownerEmail` field on the public
creator doc.

### Seeding the link

The intake form already collects the creator's email (dropped before Sanity
today). At intake/import time, record `email → creatorId` in the private store.
Then:

- On Google sign-in, match the verified email → creator → they may edit that
  creator and its books (books scoped by `creator._ref`).
- First-time link is automatic (email match). Fallback: a manual **"claim your
  profile"** flow you approve — covers a creator who signs in with a different
  Google email than they submitted with.

### Edit scoping

A server action checks the signed-in email against the private map before any
write, then writes a **draft** only for owned docs — `set` the provided fields
onto `drafts.<creatorId>`, seeded from the published doc (this update path
already exists in `import-creators.mjs`). Never touches live content; still
human-published. This gives self-serve editing **without** giving every creator
a Sanity Studio account (the heavier "Stage 4").

---

## Options & effort

| Option | Effort | Notes |
|---|---|---|
| Status quo — Google Forms + import scripts | built | Fine to a few dozen creators; the Drive + sync friction is the tax |
| Create-only native intake (no editing) | ~L | Sidesteps ownership entirely; kills the Drive problem for new submissions |
| + Google auth + ownership map (self-serve edits) | +M | The full vision |

## Recommended sequencing

1. **Foundation** (S–M): `server-only` write client; port `shared.mjs` +
   create-path mapping helpers to a TS module; extract the contact form's
   anti-spam + `useActionState` scaffold into a reusable form shell.
2. **Creator "new" form** (M): live org/genre/format dropdowns emitting
   `label + id`; image upload via the action; publish-permission gate; writes
   `drafts.creator-<slug>`. Retire `sync-creator-form.gs`.
3. **Book "new" form** (M): creator dropdown by `_id` (kills ambiguity-by-name);
   `parseLinks` port; cover upload; writes `drafts.book-<slug>`. Retire
   `sync-form-creators.gs`. Keep the back-catalogue importer.
4. **Google auth** (M): Auth.js + Google provider; gate the intake forms.
5. **Ownership map + edit scoping** (M): private store seeded at intake; edit
   forms scoped to owned docs; claim-profile fallback.

Total ~L–XL across the steps, dominated by the write boundary, uploads, auth,
and the ownership map — **not** algorithm design, which already exists.

## Risks / open items

- **Write-token boundary** — the headline risk. Strict `server-only` discipline;
  a leaked token is write/delete access to production.
- **Spam at higher stakes** — a bot now creates draft documents, not just a
  dropped email. Reuse the honeypot + timing gate; consider a shared rate-limit
  store (the in-memory one is per-instance); Google-gating helps most.
- **Validation parity** — the action must reproduce taxonomy matching, the
  three-genre cap, slug-collision handling, and the publish gate; missing any
  silently degrades data.
- **Email mismatch** — submit-email ≠ sign-in-email is handled by the claim
  fallback, but the flow has to exist.
- **Private-store choice** (dataset vs KV) — decide before starting Part 2.

## Key files

- Strategy: `docs/content-intake.md`
- Form/action precedent: `src/app/actions/contact.ts`, `src/components/contact-form.tsx`
- Logic to port: `scripts/import-creators.mjs`, `scripts/import-books.mjs`, `scripts/lib/shared.mjs`, `scripts/lib/sanity.mjs`
- Current Sanity access: `src/sanity/client.ts` (read-only), `src/sanity/env.ts`
- Schemas: `src/sanity/schemaTypes/{creator,book,organization,bookLink,socialLink,imageWithAlt}.ts`
- Taxonomy source of truth: `src/lib/taxonomy.ts`
- Form specs: `docs/{creator,book}-intake-form-brief.md`
- To retire: `scripts/apps-script/{sync-creator-form,sync-form-creators}.gs`
</content>
