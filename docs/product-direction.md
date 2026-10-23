# ND Riot — product direction (living notes)

A durable home for Stephen's product thinking between sessions — the "brain
dumps." **This is direction, not spec.** Nothing here is approved or scoped
until it's promoted to a decision: binding rules go into `AGENTS.md`, intended
work goes into `docs/feature-backlog.md`. Entries are dated and attributed so
the reasoning stays traceable.

Related: the social-network direction lives in Claude memory
(`nd-riot-social-network-vision`); §3 (discovery is user-directed, never
inferred) is the doctrine every idea below is measured against.

---

## Discovery, curation & elevation (2026-10-23)

**The shift being explored.** An iTunes / App-Store-like *curated layer* for
signed-in readers — a social-media-style "for you" view — while still refusing
the popularity/engagement loop §3 exists to prevent.

**Home → Discover.** Signed-out (no account) Home stays pure discovery. Once an
account exists, Home becomes more of a curated view, with **Discover** always
available (a tab, and the random hero still on top). Prompt readers during
signup and on the dashboard to follow creators, books, and **genres**.

**A curated row:** "similar to other books and creators you follow."

**Stephen's conditions for when elevation is acceptable:**
1. **No public elevation.** Nothing ranks contributors in anyone else's view.
2. **No one sees stats that aren't their own** / their own past actions.
3. **Elevation is opt-in** (user selection) and **easily disabled**.
4. **Discover stays easily available and encouraged _above_ the user-preference
   tunnel** — the curated view never buries open discovery.

### Open tensions (Claude's flags — to resolve before building)

- **"Similar to what you follow" is inference** — the first real departure from
  §3's "nothing is inferred." Defensible *only* if constrained to **content-based
  similarity** (shared genre / format / creator / attributes — transparent and
  explainable), **never** collaborative ("readers like you also…"), behavioral
  (what you viewed/clicked), or popularity-weighted. If adopted, it's a conscious
  **amendment to §3** and must be written into `AGENTS.md`, not drifted into.
- **Most of the "For You" home needs no inference at all.** It can be built
  entirely from *explicit* follows — creators, books, and a new **"follow a
  genre"** primitive (a saved filter; fully §3-clean, like the strips
  subscription). Only the "similar to…" row crosses into inference. Sequence
  accordingly: ship the explicit-curation home first, treat the similarity row
  as a separate, deliberate decision.
- **"Curated Discover row" has two meanings** — *editorial* (human-picked) vs.
  *algorithmic* (similarity). Both currently conflict with §3's "no curated
  front pages / no 'top' anything." Decide which is meant.
- **Make the "above the tunnel" safeguard structural**, not a guideline: the
  random hero (which ignores every filter and follow) stays on *every* Home,
  including the curated one, and Discover is never only-behind-a-tab. This is
  what keeps a curated home from becoming a filter bubble.

**Status:** exploratory. The privacy/opt-in/reversible framing is consistent
with the follower-data decision already made (counts are private, self-only,
never comparative). The one genuine §3 question is the similarity row.
