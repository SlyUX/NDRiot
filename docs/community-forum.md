# Community: native forum (the async + near-real-time alternative)

Status: **sketch for the January direction decision; nothing built.** The
counterpart to [`community-selfhost.md`](community-selfhost.md) (the Discord-like,
self-hosted path). This path drops the real-time-chat requirement and builds a
forum natively on ND Riot's existing stack — which removes the server/VPS
entirely. Weigh the two in January.

Last reviewed: 2026-11-17.

---

## The principle

**A forum is async CRUD, so it needs no chat server.** The only reason the
Discord path needed a VPS was real-time connections — presence, voice, live
channels. A forum (categories, threads, replies) is request/response over HTTP,
which the existing Next.js + Sanity stack already does. No VPS, no self-host ops,
no Rocket.Chat, no iframe SSO, no second account system.

And most of the primitives already exist: **creator-messaging is a 1:1 forum** —
threads, posts, identity gating, report/block, Studio moderation, read markers. A
group forum is the N-person generalization of the same patterns.

## "Near-real-time" without a server (verified against Sanity's client docs)

- **Public forum (public dataset):** Sanity's `client.listen()` opens a
  server-sent-events stream and pushes new posts to the browser **sub-second,
  token-free** — genuine real-time, no server of ours.
- **Roster-gated / private:** **poll the open thread every ~2s** (via a server
  action) — comfortably **<3s**, no token exposed in the browser.
- Sanity is designed for the hybrid: its live stream emits a `goaway` event when
  connection limits are hit, telling the client to **fall back to polling**.
  "Listen when you can, poll as fallback" is built into the client.

What this path **cannot** give without a real server: **presence, typing
indicators, and voice.** Everything else (near-live text, threads, search) is on
the table.

## Data model (reuses the messaging primitives)

- `forumCategory` — a board/topic (or reuse the existing genre taxonomy).
- `forumThread` — title, author (creator id), category, status (open/locked),
  `createdAt`, `lastPostAt`, optional `pinned`.
- `forumPost` — thread ref, author, body, `createdAt`. **Separate docs** (not
  inline), because forum threads grow long — unlike 1:1 messaging, where inline
  `messages[]` was fine at that scale.
- **Reuse as-is from creator-messaging:** the report-doc pattern (→ forum
  reports), the read-marker pattern (→ per-user unread per thread), identity
  gating via the ownership map, Studio Operations moderation, the loading-state
  and near-real-time mechanisms.

## The one real decision: public vs. roster-gated

- **Public-read forum** (public dataset): real-time via Sanity listen, **SEO +
  discoverability** — threads are indexable, which fits ND Riot's content/
  directory DNA. Reading open to all; **posting gated to the roster**. Trade:
  posts are world-readable immediately, so reactive moderation (report/remove) +
  the content policy carry the safety weight (same risk acceptance as messaging;
  the beta roster is trusted adults).
- **Roster-gated forum** (private dataset): closed, members-only, polling for
  near-real-time, moderated like the messaging threads. More private; no SEO, no
  token-free real-time.

Lean for ND Riot: **public-read, roster-posts** — it turns community into
discoverable content (on-brand), gets real-time for free, and keeps posting
trusted. It ties to the same **content-policy / age-gate** work (still paused)
before widening past the known roster.

## Reuse summary

Roughly **70–80% is patterns already shipped** in creator-messaging: schema docs
in a dataset, server actions with identity gating, report/block, read markers,
Studio Operations moderation, loading states. The genuinely new work is the
forum's **browse / thread / compose UI**, the **real-time wiring** (Sanity listen
or poll), and the **category model**. It's a feature on the existing stack, not an
infrastructure project — which is the whole point vs. the Discord runbook.

## For January — what to decide

1. **Forum vs. Discord-like** (this sketch vs. `community-selfhost.md`): does the
   community need a live hangout with voice/presence, or durable threaded
   discussion that's cheaper, native, and discoverable?
2. If forum: **public-read or roster-gated.**
3. Whether the **content policy / age gate** (paused, awaiting legal text) needs
   to land first, since a forum is UGC widening past 1:1 messaging.
