# Feature backlog

A running list of site features we've decided are worth doing but are **not
building yet** — parked deliberately, not forgotten. Add to it freely; promote
an item to real work only when it earns the cost.

Each item says what it is, why it's parked, and what would trigger building it.

---

## Media that supports independent comics

A place on the site to surface media that champions indie comic creators —
podcasts, websites, YouTube channels, review blogs, newsletters, and the like.
A directory of the wider support ecosystem, not a listing of the work itself.

- **Why it fits ND Riot:** the site exists to expose and redirect (not sell).
  Pointing readers toward the people already amplifying indie creators is the
  same job, one layer out.
- **Shape, roughly:** a new content type (a "media" or "supporter" document —
  name, kind, URL, blurb, maybe a logo), its own listing route, and a card
  variant. Curated/neutral ordering only, no ranking — same discovery rules as
  everything else (AGENTS.md §3).
- **Open questions:** is it its own top-level section, or part of editorial?
  Who vets entries? Does it accept submissions via a form like creators do?
- **Parked because:** the directory's core (creators + books) is still filling
  out. Worth building once there's real content to sit alongside, and once we
  know whether it's editorial-curated or submission-driven.

---

## Already-decided parks (for context)

These were decided in earlier sessions and live here so the whole backlog is in
one place.

- **Saved filters (V2).** Let a reader save a filter set and return to it. The
  filter state already lives entirely in the URL, so this is "save a URL," not a
  new storage model — but it needs reader accounts first (below). The hero stays
  random and ignores saved filters, on purpose, to prevent a narrow filter
  becoming a narrow world (AGENTS.md §3).
- **Reader accounts.** Follow specific creators, genres, or books. The blocker
  is cost, not code: it implies auth + per-user storage, and the project has no
  revenue to cover it. Revisit if there's a funding model.
- **Custom on-site intake form.** Replace the Google Form with a native
  Next.js form writing straight to Sanity (no CSV step, images upload direct,
  no field drift). Deferred with a review around **2026-10-20**; the trigger is
  submissions becoming regular rather than occasional. See the forms-strategy
  note.
