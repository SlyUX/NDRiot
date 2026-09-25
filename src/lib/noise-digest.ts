import 'server-only'

import { client } from '@/sanity/client'
import { urlFor } from '@/sanity/image'
import { savedItems } from '@/sanity/reader-client'
import { absoluteUrl } from '@/lib/site-url'
import {
  NOISE_LAST_SENT_QUERY,
  NOISE_NEW_BOOKS_QUERY,
  NOISE_STRIPS_QUERY,
  NOISE_UPCOMING_CONVENTIONS_QUERY,
  NOISE_UPDATES_QUERY,
} from '@/lib/queries'
import type { NoiseSettings } from '@/lib/site-settings'
import type {
  NoiseConvention,
  NoiseIssue,
  NoiseNewBook,
  NoiseStrip,
  NoiseUpdate,
} from '@/lib/types'

/**
 * ND Noise — composes one subscriber's personalized monthly digest into an
 * email-safe HTML string. Pure/read-only: no sends here (that's the admin send
 * route). Follow content is windowed by the issue and always recency-ordered —
 * never ranked or counted (§3). A subscriber who follows nothing still gets the
 * shared sections (the Note + Sunday Strips), so everyone on the list hears from
 * us. No greeting by name: first-name guesses go wrong too often, so we dive in.
 */

/** Per-section DISPLAY caps. When a section has more than its cap, we show a
 *  random subset (per recipient) + a "view all" link — so the selection can't
 *  be gamed by last-minute submissions, and nothing wins by recency/alphabet
 *  (§3). Under the cap, the natural (recency) order is kept. */
const STRIP_LIMIT = 12
const UPDATES_LIMIT = 20
const NEW_BOOKS_LIMIT = 12
/** How many we FETCH per section — a pool larger than the cap to randomize from
 *  (kept bounded so the query stays cheap). */
const STRIP_POOL = 100
const FOLLOW_POOL = 60
/** Conventions aren't capped/randomized — chronological, and few in a month. */
const CONVENTION_LIMIT = 25
/** Fallback window when there's no prior issue: the last 30 days. */
const DEFAULT_WINDOW_DAYS = 30
/** Full-width render size for a strip image (height scales to its aspect). */
const STRIP_WIDTH = 600
/** How far ahead the shared "upcoming conventions" section looks. */
const CONVENTION_WINDOW_DAYS = 30

// ---- brand-consistent inline styles (email clients ignore <style>) ----
const BG = '#030303'
const FG = '#ffffff'
const PINK = '#FF0095'
const MUTED = '#A1A1AA'
const BORDER = '#282828'
// The "Sunday funnies" insert — a light-gray panel that stands apart from the
// dark brand email, for that old-fashioned comics-page feel.
const PANEL = '#cccccc'
const INK = '#1a1a1a'
const INK_MUTED = '#4a4a4a'
// One sans-serif stack for the whole email, funnies panel included.
const SANS = 'Helvetica, Arial, sans-serif'
/** The ND Riot wordmark, displayed at 150px (rendered 2x for crispness). */
const LOGO_PATH = '/nd-riot-logo-email.png'

/** Escape text for safe interpolation into HTML. */
// (No first-name greeting — see the module header.)
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Choose what to display for a section: if it fits within `limit`, keep the
 * natural (recency) order; if it overflows, return a RANDOM subset (Fisher-Yates
 * on a copy). Called per recipient, so the random pick differs for each — which
 * is what stops last-minute submissions (or alphabetical order) from gaming
 * which items get seen (§3). `hasMore` says whether to show a "view all" link.
 */
function pickForDisplay<T>(items: readonly T[], limit: number): { shown: T[]; hasMore: boolean } {
  if (items.length <= limit) return { shown: items.slice(), hasMore: false }
  const a = items.slice()
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return { shown: a.slice(0, limit), hasMore: true }
}

/** A "view all" link shown at the bottom of a capped section (pink, underlined). */
function viewAllLink(href: string, label: string): string {
  return `<div style="margin:8px 0 0 0;"><a href="${escapeHtml(
    absoluteUrl(href),
  )}" style="color:${PINK};text-decoration:underline;font-weight:600;">${escapeHtml(label)}</a></div>`
}

/** Only http(s)/mailto hrefs survive — never javascript: etc. */
function safeHref(href: string): string | null {
  try {
    const url = new URL(href, 'https://ndriot.com')
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.toString() : null
  } catch {
    return null
  }
}

type NoteBlocks = NonNullable<NoiseIssue['note']>
type NoteBlock = NoteBlocks[number]

/**
 * Minimal, escaping-safe Portable Text → HTML for the authored Note. Handles the
 * block styles the schema allows (normal / h3), bullet lists, and the strong /
 * em / link marks — nothing else, by design (keeps the email simple + safe).
 */
export function noteToHtml(blocks: NoteBlocks | undefined | null): string {
  if (!blocks || blocks.length === 0) return ''
  const out: string[] = []
  let inList = false
  const closeList = () => {
    if (inList) {
      out.push('</ul>')
      inList = false
    }
  }

  for (const block of blocks) {
    if (!isTextBlock(block)) continue
    const markDefs = block.markDefs ?? []
    const inner = (block.children ?? [])
      .map((span) => {
        let text = escapeHtml(span.text ?? '')
        const marks = span.marks ?? []
        for (const mark of marks) {
          const def = markDefs.find((d) => d._key === mark)
          if (def && def._type === 'link') {
            const href = typeof def.href === 'string' ? safeHref(def.href) : null
            if (href) {
              text = `<a href="${escapeHtml(href)}" style="color:${PINK};">${text}</a>`
            }
          } else if (mark === 'strong') {
            text = `<strong>${text}</strong>`
          } else if (mark === 'em') {
            text = `<em>${text}</em>`
          }
        }
        return text
      })
      .join('')

    if (block.listItem === 'bullet') {
      if (!inList) {
        out.push(`<ul style="margin:0 0 12px 0;padding-left:20px;color:${FG};">`)
        inList = true
      }
      out.push(`<li style="margin:0 0 4px 0;">${inner}</li>`)
      continue
    }
    closeList()
    if (block.style === 'h3') {
      out.push(`<h3 style="margin:16px 0 8px 0;font-size:18px;color:${FG};">${inner}</h3>`)
    } else {
      out.push(`<p style="margin:0 0 12px 0;line-height:1.5;color:${FG};">${inner}</p>`)
    }
  }
  closeList()
  return out.join('\n')
}

function isTextBlock(
  block: NoteBlock,
): block is Extract<NoteBlock, { _type: 'block' }> {
  return (block as { _type?: string })._type === 'block'
}

/** The moment content must be newer than, to count as "new" this issue. */
export async function resolveWindowSince(issue: NoiseIssue): Promise<string> {
  if (issue.windowStart) return issue.windowStart
  const lastSent = await client.fetch(NOISE_LAST_SENT_QUERY)
  if (lastSent?.sentAt) return lastSent.sentAt
  const fallback = new Date()
  fallback.setDate(fallback.getDate() - DEFAULT_WINDOW_DAYS)
  return fallback.toISOString()
}

/** The shared Sunday Strips pool — strips published since the issue window, a
 *  bounded pool to randomize each recipient's showcase from (the per-recipient
 *  pick happens at render). Windowed so every strip shown is new this issue. */
export async function fetchSharedStrips(since: string): Promise<NoiseStrip[]> {
  return client.fetch(NOISE_STRIPS_QUERY, { since, limit: STRIP_POOL })
}

export interface FollowContent {
  updates: NoiseUpdate[]
  newBooks: NoiseNewBook[]
}

/** Everything a subscriber's own follows produced in the window. */
export async function fetchFollowContent(
  email: string,
  since: string,
): Promise<FollowContent> {
  const saved = await savedItems(email)
  const creatorIds = saved.filter((s) => s.itemType === 'creator').map((s) => s.itemId)
  const bookIds = saved.filter((s) => s.itemType === 'book').map((s) => s.itemId)
  const updateIds = [...creatorIds, ...bookIds]

  if (updateIds.length === 0 && creatorIds.length === 0) {
    return { updates: [], newBooks: [] }
  }

  const [updates, newBooks] = await Promise.all([
    updateIds.length
      ? client.fetch(NOISE_UPDATES_QUERY, { ids: updateIds, since, limit: FOLLOW_POOL })
      : Promise.resolve<NoiseUpdate[]>([]),
    creatorIds.length
      ? client.fetch(NOISE_NEW_BOOKS_QUERY, { ids: creatorIds, since, limit: FOLLOW_POOL })
      : Promise.resolve<NoiseNewBook[]>([]),
  ])
  return { updates, newBooks }
}

/**
 * Upcoming conventions with confirmed dates in the next 30 days — a SHARED
 * section (same for every subscriber, not follow-based), each with the creators
 * who've marked an appearance there. Dates are date-only strings, so the window
 * bounds are computed the same way.
 */
export async function fetchUpcomingConventions(): Promise<NoiseConvention[]> {
  const today = new Date()
  const until = new Date()
  until.setDate(until.getDate() + CONVENTION_WINDOW_DAYS)
  const ymd = (d: Date) => d.toISOString().slice(0, 10)
  return client.fetch(NOISE_UPCOMING_CONVENTIONS_QUERY, {
    today: ymd(today),
    until: ymd(until),
    limit: CONVENTION_LIMIT,
  })
}

// ---- HTML section builders --------------------------------------------

function sectionHeading(text: string): string {
  return `<h2 style="margin:28px 0 12px 0;font-size:21px;letter-spacing:0.06em;text-transform:uppercase;color:${PINK};border-bottom:1px solid ${BORDER};padding-bottom:8px;">${escapeHtml(
    text,
  )}</h2>`
}

function link(path: string, label: string): string {
  return `<a href="${escapeHtml(absoluteUrl(path))}" style="color:${PINK};text-decoration:none;">${escapeHtml(
    label,
  )}</a>`
}

function updatesSection(heading: string, updates: NoiseUpdate[], footer = ''): string {
  if (updates.length === 0) return ''
  const rows = updates
    .map((u) => {
      const name = u.targetName ?? 'ND Riot'
      const path =
        u.targetType === 'book' ? `/comics/${u.targetSlug ?? ''}` : `/creators/${u.targetSlug ?? ''}`
      const who = u.targetSlug ? link(path, name) : escapeHtml(name)
      const body = escapeHtml((u.body ?? '').trim())
      return `<div style="margin:0 0 14px 0;"><div style="font-weight:700;color:${FG};">${who}</div><div style="color:${MUTED};line-height:1.5;">${body}</div></div>`
    })
    .join('')
  return sectionHeading(heading) + rows + footer
}

/** The distinct creators attending a convention, with profile slugs (empty if none). */
function attendingCreators(con: NoiseConvention): { name: string; slug: string | null }[] {
  const seen = new Map<string, { name: string; slug: string | null }>()
  for (const c of con.creators ?? []) {
    const name = c.name?.trim()
    if (!name) continue
    const key = c.slug ?? name
    if (!seen.has(key)) seen.set(key, { name, slug: c.slug ?? null })
  }
  return [...seen.values()]
}

function conventionsSection(heading: string, conventions: NoiseConvention[]): string {
  if (conventions.length === 0) return ''
  const rows = conventions
    .map((con) => {
      const name = con.slug
        ? link(`/conventions/${con.slug}`, con.name ?? 'A convention')
        : escapeHtml(con.name ?? 'A convention')
      const where = [con.city, con.region].filter(Boolean).join(', ')
      const when = formatDateRange(con.startDate, con.endDate)
      const meta = [when, where].filter(Boolean).join(' · ')
      const people = attendingCreators(con)
      const attending = people.length
        ? `<div style="color:${FG};line-height:1.5;">Attending: ${people
            .map((p) =>
              p.slug
                ? `<a href="${escapeHtml(
                    absoluteUrl(`/creators/${p.slug}`),
                  )}" style="color:${FG};text-decoration:underline;">${escapeHtml(p.name)}</a>`
                : escapeHtml(p.name),
            )
            .join(', ')}</div>`
        : ''
      return `<div style="margin:0 0 14px 0;"><div style="font-weight:700;color:${FG};">${name}</div>${
        meta ? `<div style="color:${MUTED};">${escapeHtml(meta)}</div>` : ''
      }${attending}</div>`
    })
    .join('')
  return sectionHeading(heading) + rows
}

function newBooksSection(heading: string, books: NoiseNewBook[], footer = ''): string {
  if (books.length === 0) return ''
  const rows = books
    .map((b) => {
      const title = b.slug ? link(`/comics/${b.slug}`, b.title ?? 'Untitled') : escapeHtml(b.title ?? 'Untitled')
      const by = b.creatorName ? ` <span style="color:${MUTED};">by ${escapeHtml(b.creatorName)}</span>` : ''
      return `<div style="margin:0 0 8px 0;color:${FG};">${title}${by}</div>`
    })
    .join('')
  return sectionHeading(heading) + rows + footer
}

/**
 * The Sunday Strips showcase — up to a dozen strips (a random subset per
 * recipient when there are more), each shown FULL WIDTH like a newspaper comics
 * page, on a light-gray panel with a bold masthead and a double rule. When a
 * subset is shown, ends with a link to the full strips listing.
 */
function stripsSection(
  heading: string,
  subline: string,
  allLabel: string,
  strips: NoiseStrip[],
  hasMore: boolean,
): string {
  if (strips.length === 0) return ''
  const items = strips
    .map((s) => {
      const dims = s.dimensions
      const height =
        dims?.width && dims?.height
          ? Math.round((STRIP_WIDTH * dims.height) / dims.width)
          : undefined
      const img = s.image
        ? `<img src="${escapeHtml(
            urlFor(s.image).width(STRIP_WIDTH).url(),
          )}" width="${STRIP_WIDTH}"${height ? ` height="${height}"` : ''} alt="${escapeHtml(
            s.title ?? 'Strip',
          )}" style="display:block;width:100%;height:auto;border:1px solid ${INK};background:#ffffff;" />`
        : ''
      const credit = `<div style="font-family:${SANS};color:${INK};margin:6px 0 0 0;"><span style="font-weight:700;">${escapeHtml(
        s.title ?? 'Strip',
      )}</span>${s.creatorName ? ` <span style="font-style:italic;">by ${escapeHtml(s.creatorName)}</span>` : ''}</div>`
      const caption = s.caption
        ? `<div style="font-family:${SANS};font-style:italic;color:${INK_MUTED};font-size:13px;margin-top:2px;">${escapeHtml(
            s.caption,
          )}</div>`
        : ''
      const inner = `${img}${credit}${caption}`
      const wrapped = s.slug
        ? `<a href="${escapeHtml(absoluteUrl(`/strips/${s.slug}`))}" style="text-decoration:none;color:${INK};">${inner}</a>`
        : inner
      return `<div style="margin:0 0 22px 0;">${wrapped}</div>`
    })
    .join('')
  // Only offer "see all" when we're actually showing a subset.
  const all = hasMore
    ? `<div style="text-align:center;margin:4px 0 0 0;"><a href="${escapeHtml(
        absoluteUrl('/comics?tab=strips'),
      )}" style="font-family:${SANS};font-weight:700;color:${INK};text-decoration:underline;">${escapeHtml(
        allLabel,
      )}</a></div>`
    : ''
  const sublineHtml = subline
    ? `<div style="font-size:13px;font-style:italic;color:${INK_MUTED};margin-top:6px;">${escapeHtml(
        subline,
      )}</div>`
    : ''
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PANEL};margin:24px 0;"><tr><td style="padding:20px;"><div style="font-family:${SANS};text-align:center;border-bottom:3px double ${INK};padding-bottom:8px;margin-bottom:16px;"><div style="font-size:24px;font-weight:900;letter-spacing:0.02em;color:${INK};">${escapeHtml(
    heading,
  )}</div>${sublineHtml}</div>${items}${all}</td></tr></table>`
}

/** Format a date-only string (YYYY-MM-DD) in local time, no timezone drift. */
function formatYmd(ymd?: string | null): string {
  const m = ymd ? /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd) : null
  if (!m) return ''
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** "Oct 15, 2026", or "Oct 15 – 17, 2026" when a multi-day end date exists. */
function formatDateRange(start?: string | null, end?: string | null): string {
  const startStr = formatYmd(start)
  if (!startStr) return ''
  if (!end || end === start) return startStr
  return `${startStr} – ${formatYmd(end)}`
}

/** Flatten the Note's blocks to plain text, for the text/plain email part. */
function noteToText(blocks: NoteBlocks | undefined | null): string {
  if (!blocks) return ''
  return blocks
    .filter(isTextBlock)
    .map((b) => (b.children ?? []).map((s) => s.text ?? '').join(''))
    .filter(Boolean)
    .join('\n\n')
}

/** The per-recipient content actually shown (already capped/randomized), shared
 *  by the HTML and text renderers so both show the identical selection. */
interface DisplayContent {
  strips: NoiseStrip[]
  stripsMore: boolean
  conventions: NoiseConvention[]
  updates: NoiseUpdate[]
  updatesMore: boolean
  newBooks: NoiseNewBook[]
  newBooksMore: boolean
  hasFollow: boolean
}

/** A concise text/plain alternative — the same content + order, no markup. */
function buildText(input: RenderInput, d: DisplayContent): string {
  const { issue, settings, unsubscribeUrl } = input
  const lines: string[] = [settings.mastheadTitle.toUpperCase(), '']
  const note = noteToText(issue.note)
  if (note) lines.push(settings.noteHeading.toUpperCase(), note, '')

  if (d.strips.length) {
    lines.push(settings.stripsHeading.toUpperCase())
    if (settings.stripsSubline) lines.push(settings.stripsSubline)
    for (const s of d.strips) lines.push(`• ${s.title ?? 'Strip'}${s.creatorName ? ` by ${s.creatorName}` : ''}${s.slug ? ` — ${absoluteUrl(`/strips/${s.slug}`)}` : ''}`)
    if (d.stripsMore) lines.push(`${settings.stripsAllLabel} ${absoluteUrl('/comics?tab=strips')}`)
    lines.push('')
  }

  if (d.conventions.length) {
    lines.push(settings.conventionsHeading.toUpperCase())
    for (const c of d.conventions) {
      const meta = [formatDateRange(c.startDate, c.endDate), [c.city, c.region].filter(Boolean).join(', ')]
        .filter(Boolean)
        .join(' · ')
      lines.push(`• ${c.name ?? 'A convention'}${meta ? ` (${meta})` : ''}`)
      const names = attendingCreators(c).map((p) => p.name)
      if (names.length) lines.push(`  Attending: ${names.join(', ')}`)
    }
    lines.push('')
  }

  if (d.hasFollow) {
    if (d.updates.length) {
      lines.push(settings.updatesHeading.toUpperCase())
      for (const u of d.updates) lines.push(`• ${u.targetName ?? 'ND Riot'}: ${(u.body ?? '').trim()}`)
      if (d.updatesMore) lines.push(`${settings.updatesAllLabel} ${absoluteUrl('/me')}`)
      lines.push('')
    }
    if (d.newBooks.length) {
      lines.push(settings.newBooksHeading.toUpperCase())
      for (const b of d.newBooks) lines.push(`• ${b.title ?? 'Untitled'}${b.creatorName ? ` by ${b.creatorName}` : ''}`)
      if (d.newBooksMore) lines.push(`${settings.newBooksAllLabel} ${absoluteUrl('/comics')}`)
      lines.push('')
    }
  } else {
    lines.push(settings.emptyFollowsNudge, '')
  }

  lines.push(settings.signoff, '', settings.footerLine, `${settings.unsubscribeLabel}: ${unsubscribeUrl}`)
  return lines.join('\n')
}

// ---- the full email ---------------------------------------------------

export interface RenderInput {
  issue: NoiseIssue
  settings: NoiseSettings
  follow: FollowContent
  strips: NoiseStrip[]
  conventions: NoiseConvention[]
  unsubscribeUrl: string
}

/**
 * Assemble the full HTML email for one subscriber. Returns the subject and body
 * plus whether any personalized content landed (useful for logging/preview).
 */
export function renderNoiseEmail(input: RenderInput): {
  subject: string
  html: string
  text: string
  hasFollowContent: boolean
} {
  const { issue, settings, follow, strips, conventions, unsubscribeUrl } = input

  // Cap + (per-recipient) randomize each list; conventions are left whole.
  const stripPick = pickForDisplay(strips, STRIP_LIMIT)
  const updatePick = pickForDisplay(follow.updates, UPDATES_LIMIT)
  const newBookPick = pickForDisplay(follow.newBooks, NEW_BOOKS_LIMIT)
  const hasFollowContent = updatePick.shown.length > 0 || newBookPick.shown.length > 0

  const display: DisplayContent = {
    strips: stripPick.shown,
    stripsMore: stripPick.hasMore,
    conventions,
    updates: updatePick.shown,
    updatesMore: updatePick.hasMore,
    newBooks: newBookPick.shown,
    newBooksMore: newBookPick.hasMore,
    hasFollow: hasFollowContent,
  }

  const noteHtml = noteToHtml(issue.note)
  const noteBlock = noteHtml
    ? `${sectionHeading(settings.noteHeading)}${noteHtml}`
    : ''

  const followBlocks = hasFollowContent
    ? [
        updatesSection(
          settings.updatesHeading,
          display.updates,
          display.updatesMore ? viewAllLink('/me', settings.updatesAllLabel) : '',
        ),
        newBooksSection(
          settings.newBooksHeading,
          display.newBooks,
          display.newBooksMore ? viewAllLink('/comics', settings.newBooksAllLabel) : '',
        ),
      ].join('')
    : `<p style="margin:20px 0;color:${MUTED};line-height:1.5;">${escapeHtml(
        settings.emptyFollowsNudge,
      )}</p>`

  // No greeting — we dive straight in (first-name guesses go wrong too often).
  // Order: the note, the Sunday Strips funnies, upcoming conventions (shared),
  // then the reader's personalized follow updates.
  const body = [
    noteBlock,
    stripsSection(
      settings.stripsHeading,
      settings.stripsSubline,
      settings.stripsAllLabel,
      display.strips,
      display.stripsMore,
    ),
    conventionsSection(settings.conventionsHeading, conventions),
    followBlocks,
  ].join('\n')

  const footer = [
    `<p style="margin:28px 0 6px 0;color:${FG};">${escapeHtml(settings.signoff)}</p>`,
    `<hr style="border:none;border-top:1px solid ${BORDER};margin:20px 0;" />`,
    `<p style="margin:0 0 6px 0;color:${MUTED};font-size:12px;line-height:1.5;">${escapeHtml(
      settings.footerLine,
    )}</p>`,
    `<p style="margin:0;font-size:12px;"><a href="${escapeHtml(
      unsubscribeUrl,
    )}" style="color:${MUTED};">${escapeHtml(settings.unsubscribeLabel)}</a></p>`,
  ].join('\n')

  const subject = issue.subject ?? settings.mastheadTitle
  const html = `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(
    subject,
  )}</title></head><body style="margin:0;padding:0;background:${BG};"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG};"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;font-family:${SANS};color:${FG};"><tr><td><div style="text-align:left;margin:0 0 16px 0;"><img src="${escapeHtml(
    absoluteUrl(LOGO_PATH),
  )}" width="150" alt="ND Riot" style="display:block;width:150px;max-width:150px;height:auto;border:0;" /></div><div style="font-weight:900;letter-spacing:-0.01em;text-transform:uppercase;font-size:20px;line-height:1.2;color:${PINK};margin:0 0 12px 0;">${escapeHtml(
    settings.mastheadTitle,
  )}</div>${body}${footer}</td></tr></table></td></tr></table></body></html>`

  const text = buildText(input, display)
  return { subject, html, text, hasFollowContent }
}

/**
 * Compose the full email for one subscriber — the single path both the admin
 * preview and the send use, so a preview is byte-identical to what ships. Loads
 * the subscriber's follow content, builds the signed unsubscribe link, renders.
 */
export async function composeSubscriberEmail(params: {
  email: string
  issue: NoiseIssue
  settings: NoiseSettings
  strips: NoiseStrip[]
  conventions: NoiseConvention[]
  since: string
  unsubscribeUrl: string
}): Promise<{ subject: string; html: string; text: string; hasFollowContent: boolean }> {
  const follow = await fetchFollowContent(params.email, params.since)
  return renderNoiseEmail({
    issue: params.issue,
    settings: params.settings,
    follow,
    strips: params.strips,
    conventions: params.conventions,
    unsubscribeUrl: params.unsubscribeUrl,
  })
}
