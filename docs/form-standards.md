# Form Standards

Status: **binding for every on-site form.** Distilled from building the creator
intake form (the first native form). The book form and anything after inherit
these; deviating is a decision to be argued, not a default.

Last reviewed: 2026-07-28.

Companion docs: [`content-intake.md`](content-intake.md) (the intake strategy
this serves), [`native-intake-brief.md`](native-intake-brief.md) (the Stage-3 +
ownership implementation), and the field-level briefs
([`creator-intake-form-brief.md`](creator-intake-form-brief.md),
[`book-intake-form-brief.md`](book-intake-form-brief.md)). The QA rules in
`AGENTS.md` sit above all of this.

---

## The one principle

**A form is an intake buffer, never a source of truth.** A submission becomes a
Sanity **review draft** — never live content, never an auto-publish. The
draft/publish split *is* the approval queue; a human publishes. Everything below
is downstream of this.

---

## 1 · Data & trust

- **Drafts only.** The action writes `drafts.<id>`. Nothing a submitter sends
  goes live without a human publishing it in the Studio.
  - *Honest exceptions, both flagged in code:* an **organization** referenced by
    a submission is created **published** (a draft can't reference a nonexistent
    doc), and a creator editing their **studio** patches that shared org's
    website/logo **live**. Both are deliberate, both are noted where they
    happen. A new form should reuse these paths, not invent new live-write
    surfaces.
- **The write token never reaches the client.** It lives only behind
  `import 'server-only'` in `src/sanity/write-client.ts` (and the ownership
  client), used only inside `'use server'` actions. This is the whole security
  model — one boundary, enforced by the compiler. A form that needs the token in
  a client component is wrong.
- **Validation is server-authoritative.** The action re-validates everything:
  required fields, taxonomy matching, URL structure, references against real
  document ids. The client *guides* (prefills, a live cap, sanitize-on-type) but
  is never trusted. GROQ is always parameterized (`$id`, `$email`) — never
  string-built from input.
- **Blanks never destroy data.** On an update, the draft is seeded from the
  published doc and only *supplied* fields are patched; a blank keeps what's
  live. Identity (name/slug) is preserved — an update never renames.
- **No PII in the public dataset.** Production is world-readable. A submitter's
  email is a consent + ownership key, not content: it lives only in the private
  `ndriot_auth` dataset and on best-effort notifications, never on the public
  document.

## 2 · Identity & references

- **Controlled vocabularies, not free text.** Genres, formats, social platforms,
  link kinds come from `src/lib/taxonomy.ts` as dropdowns — the single source of
  truth shared by the schema options and the form. This is what stops
  `Sci-Fi` and `Science Fiction` becoming two pages.
- **References submit ids, not typed names.** Studio, organizations, and (on the
  book form) the creator are chosen from live Sanity data and submitted as
  document `_id`s. Re-deriving identity from a typed name is what forks records.
- **A "not listed?" escape is always present, and never traps.** A dropdown
  constrains choice; an escape hatch (add-an-organization, create-a-studio)
  keeps it from becoming a wall. New orgs/studios are resolved find-or-create by
  exact name (reuse before create), mirroring the importer.

## 3 · Ownership & access

- **Sign-in is required** (Google, identity only — no passwords, no accounts).
  Re-checked in the action, never trusted from the client.
- **Creating establishes ownership; editing is gated.** A new submission records
  `email → id` in the private ownership map. An edit is allowed **only** if the
  signed-in email owns the target — and the gate is **fail-closed**: any error
  denies the edit rather than allowing it.
- **Reads are fail-safe; gates are fail-closed.** An ownership read that errors
  returns "owns nothing" so the page still renders; the gate that errors denies.
  Every fetch goes through `safeFetch` with an explicit fallback.
- **The form meets the owner where they are.** Signed in and owning one thing →
  it auto-loads for editing, prepopulated. Owning several → a picker. Owning
  none → the create form. `?new` always forces create.

## 4 · Copy is CMS-managed

- **Every reader-facing string comes from Sanity** (`siteSettings`): labels,
  hints, placeholders, section headings, success/error text, the consent
  statement. Add the schema field *with* the component, not after.
- **Legitimate exceptions:** `aria-label`s, and inline **validation microcopy**
  in the action ("Please add your name.") — error-boundary text, the §2
  exception, kept beside the logic like the contact action does.
- **Option lists are taxonomy, not copy.** The genre/format/platform *values*
  come from `taxonomy.ts` so the form and schema can't drift; only the
  surrounding words are CMS.

## 5 · Images

- **Downscale in the browser before upload.** A phone photo becomes ~300 KB
  (≤1600px JPEG, EXIF-aware). This keeps request bodies small (Server Actions
  cap at a few MB) and storage lean — no separate optimization tool needed;
  display already runs through `next/image` + the Sanity CDN at explicit widths.
- **Raster only.** Uploads are allowlisted to JPG/PNG/WebP. SVG is rejected —
  it can carry scripts, and the site renders logos through `next/image` anyway.
- **Validate type + size with a *visible* error.** Wrong type or over the hard
  cap shows a message on the field. The server enforces the same limits
  independently.
- **Preview the current image on edit**, with a "re-upload only to replace"
  note, so nobody re-uploads what's already there. Avatars crop
  (`object-cover`); logos don't (`object-contain`).
- **Ask for alt text as its own question**, separate from the description — or a
  description field fills with marketing copy.

## 6 · URLs

- **Prefill `https://www.`** on URL fields so a creator just types their domain.
- **Normalize + validate** every URL server-side (`normalizeUrl`): add a scheme,
  require a real host, drop a bare `https://www.` rather than storing junk.
- **Socials are account names, not URLs.** The creator types a handle; the
  action stores the platform's canonical prefix + handle
  (`SOCIAL_PROFILE_PREFIX`). Handles are sanitized to `[A-Za-z0-9._-]`.
- **Guard every rendered external link** with `externalHref()` — only
  `http(s)`/`mailto` become a live `href`; anything else renders unlinked.
  Defense-in-depth, regardless of how the data got in.

## 7 · Anti-abuse & consent

- **Layered, quiet anti-spam:** an off-screen honeypot, a mount-time timing
  gate, a per-IP rate limit, plus the sign-in gate. Bot signals return a
  *silent* success — tell a bot nothing.
- **Consent is captured explicitly.** A required permission-to-publish checkbox;
  the verified email is the record of who agreed. This is the one field that is
  legal, not merely operational.

## 8 · Notifications

- **Team + submitter, both best-effort and env-gated.** The team gets the
  arrival signal and consent record; the submitter gets a confirmation
  (reply-to `submission@ndriot.com`). A mail failure must never fail an
  already-saved draft.

## 9 · UX, accessibility & construction

- **Progressive enhancement.** Built on a plain `<form action={…}>`; it submits
  without JavaScript. `useActionState` adds pending state and inline errors once
  hydrated — the server path is identical either way.
- **Reuse before building** (§4). The contact form's anti-spam and the importer's
  mapping/validation were ported, not reinvented; repeated field shapes share
  one component (`PairedRowsField`). A new form starts by reaching for these.
- **Client helpers are live previews of server truth, never a second source.**
  The address auto-suggest, the three-genre cap, handle prefixes — each mirrors
  what the action does on submit, so JS off changes nothing but polish.
- **Semantics + focus:** real `<label>`s, `<button>`/`<a>` for actions, visible
  focus, one `<h1>` per page.

---

## Applying these to the book form

The book form **inherits everything above unchanged.** What's new is mostly
field shape, not philosophy:

- **Creator reference by id**, from a live dropdown — the same "submit the id,
  not the name" rule as studio/orgs.
- **Buy/read/support/back links** as repeatable rows (reuse `PairedRowsField` +
  `LINK_KINDS` from taxonomy), each URL normalized and render-guarded.
- **Cover image** through the same downscale → raster-only → validated → preview
  pipeline; alt text asked separately.
- **Status, format, maturity** as controlled vocabularies.
- **Ownership:** gated to the book's creator — a creator adds/edits only books
  under a creator they own. Same fail-closed check, keyed by `creator._ref`.
- Keep the **back-catalogue CSV importer** regardless — nobody fills a form
  fifteen times.
