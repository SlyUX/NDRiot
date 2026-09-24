import 'server-only'

import { client } from '@/sanity/client'
import { urlFor } from '@/sanity/image'
import { savedItems } from '@/sanity/reader-client'
import { absoluteUrl } from '@/lib/site-url'
import {
  NOISE_APPEARANCES_QUERY,
  NOISE_LAST_SENT_QUERY,
  NOISE_LATEST_STRIPS_QUERY,
  NOISE_NEW_BOOKS_QUERY,
  NOISE_UPDATES_QUERY,
} from '@/lib/queries'
import type { NoiseSettings } from '@/lib/site-settings'
import type {
  NoiseAppearance,
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

/** A generous per-section cap — an email shouldn't run to hundreds of rows. */
const SECTION_LIMIT = 25
/** The Sunday Strips showcase — the latest six, shown full width. */
const STRIP_LIMIT = 6
/** Fallback window when there's no prior issue: the last 30 days. */
const DEFAULT_WINDOW_DAYS = 30
/** Full-width render size for a strip image (height scales to its aspect). */
const STRIP_WIDTH = 600

// ---- brand-consistent inline styles (email clients ignore <style>) ----
const BG = '#030303'
const FG = '#ffffff'
const PINK = '#FF0095'
const MUTED = '#A1A1AA'
const BORDER = '#282828'
// The "Sunday funnies" insert — a newsprint panel that stands apart from the
// dark brand email, for that old-fashioned comics-page feel.
const CREAM = '#f5edd8'
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

/** The shared Sunday Strips showcase — the latest six, same for everyone. */
export async function fetchSharedStrips(): Promise<NoiseStrip[]> {
  return client.fetch(NOISE_LATEST_STRIPS_QUERY, { limit: STRIP_LIMIT })
}

export interface FollowContent {
  updates: NoiseUpdate[]
  newBooks: NoiseNewBook[]
  appearances: NoiseAppearance[]
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
    return { updates: [], newBooks: [], appearances: [] }
  }

  const [updates, newBooks, appearances] = await Promise.all([
    updateIds.length
      ? client.fetch(NOISE_UPDATES_QUERY, { ids: updateIds, since, limit: SECTION_LIMIT })
      : Promise.resolve<NoiseUpdate[]>([]),
    creatorIds.length
      ? client.fetch(NOISE_NEW_BOOKS_QUERY, { ids: creatorIds, since, limit: SECTION_LIMIT })
      : Promise.resolve<NoiseNewBook[]>([]),
    creatorIds.length
      ? client.fetch(NOISE_APPEARANCES_QUERY, { ids: creatorIds, limit: SECTION_LIMIT })
      : Promise.resolve<NoiseAppearance[]>([]),
  ])
  return { updates, newBooks, appearances }
}

// ---- HTML section builders --------------------------------------------

function sectionHeading(text: string): string {
  return `<h2 style="margin:28px 0 10px 0;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;color:${PINK};border-bottom:1px solid ${BORDER};padding-bottom:6px;">${escapeHtml(
    text,
  )}</h2>`
}

function link(path: string, label: string): string {
  return `<a href="${escapeHtml(absoluteUrl(path))}" style="color:${PINK};text-decoration:none;">${escapeHtml(
    label,
  )}</a>`
}

function updatesSection(heading: string, updates: NoiseUpdate[]): string {
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
  return sectionHeading(heading) + rows
}

function conventionsSection(heading: string, appearances: NoiseAppearance[]): string {
  if (appearances.length === 0) return ''
  const rows = appearances
    .map((a) => {
      const venue = a.venueSlug
        ? link(`/conventions/${a.venueSlug}`, a.venueName ?? 'A convention')
        : escapeHtml(a.venueName ?? 'A convention')
      const when = a.forDate ? formatDate(a.forDate) : ''
      const creator = escapeHtml(a.creatorName ?? 'A creator')
      const tail = when ? ` · <span style="color:${MUTED};">${escapeHtml(when)}</span>` : ''
      return `<div style="margin:0 0 8px 0;color:${FG};">${creator} at ${venue}${tail}</div>`
    })
    .join('')
  return sectionHeading(heading) + rows
}

function newBooksSection(heading: string, books: NoiseNewBook[]): string {
  if (books.length === 0) return ''
  const rows = books
    .map((b) => {
      const title = b.slug ? link(`/comics/${b.slug}`, b.title ?? 'Untitled') : escapeHtml(b.title ?? 'Untitled')
      const by = b.creatorName ? ` <span style="color:${MUTED};">by ${escapeHtml(b.creatorName)}</span>` : ''
      return `<div style="margin:0 0 8px 0;color:${FG};">${title}${by}</div>`
    })
    .join('')
  return sectionHeading(heading) + rows
}

/**
 * The Sunday Strips showcase — the latest six strips, each shown FULL WIDTH like
 * a newspaper comics page, on a cream newsprint panel with a serif masthead and
 * a double rule. Ends with a link to the full, recency-ordered strips listing.
 */
function stripsSection(heading: string, allLabel: string, strips: NoiseStrip[]): string {
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
  const all = `<div style="text-align:center;margin:4px 0 0 0;"><a href="${escapeHtml(
    absoluteUrl('/comics?tab=strips'),
  )}" style="font-family:${SANS};font-weight:700;color:${INK};text-decoration:underline;">${escapeHtml(
    allLabel,
  )}</a></div>`
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CREAM};margin:24px 0;"><tr><td style="padding:20px;"><div style="font-family:${SANS};text-align:center;border-bottom:3px double ${INK};padding-bottom:8px;margin-bottom:16px;"><div style="font-size:24px;font-weight:900;letter-spacing:0.02em;color:${INK};">${escapeHtml(
    heading,
  )}</div></div>${items}${all}</td></tr></table>`
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return ''
  }
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

/** A concise text/plain alternative — the same content + order, no markup. */
function buildText(input: RenderInput, hasFollow: boolean): string {
  const { issue, settings, follow, strips, unsubscribeUrl } = input
  const lines: string[] = [settings.mastheadTitle.toUpperCase(), '']
  const note = noteToText(issue.note)
  if (note) lines.push(settings.noteHeading.toUpperCase(), note, '')

  if (strips.length) {
    lines.push(settings.stripsHeading.toUpperCase())
    for (const s of strips) lines.push(`• ${s.title ?? 'Strip'}${s.creatorName ? ` by ${s.creatorName}` : ''}${s.slug ? ` — ${absoluteUrl(`/strips/${s.slug}`)}` : ''}`)
    lines.push(`${settings.stripsAllLabel} ${absoluteUrl('/comics?tab=strips')}`, '')
  }

  if (hasFollow) {
    if (follow.updates.length) {
      lines.push(settings.updatesHeading.toUpperCase())
      for (const u of follow.updates) lines.push(`• ${u.targetName ?? 'ND Riot'}: ${(u.body ?? '').trim()}`)
      lines.push('')
    }
    if (follow.appearances.length) {
      lines.push(settings.conventionsHeading.toUpperCase())
      for (const a of follow.appearances) {
        const when = a.forDate ? ` (${formatDate(a.forDate)})` : ''
        lines.push(`• ${a.creatorName ?? 'A creator'} at ${a.venueName ?? 'a convention'}${when}`)
      }
      lines.push('')
    }
    if (follow.newBooks.length) {
      lines.push(settings.newBooksHeading.toUpperCase())
      for (const b of follow.newBooks) lines.push(`• ${b.title ?? 'Untitled'}${b.creatorName ? ` by ${b.creatorName}` : ''}`)
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
  const { issue, settings, follow, strips, unsubscribeUrl } = input

  const hasFollowContent =
    follow.updates.length > 0 || follow.newBooks.length > 0 || follow.appearances.length > 0

  const noteHtml = noteToHtml(issue.note)
  const noteBlock = noteHtml
    ? `${sectionHeading(settings.noteHeading)}${noteHtml}`
    : ''

  const followBlocks = hasFollowContent
    ? [
        updatesSection(settings.updatesHeading, follow.updates),
        conventionsSection(settings.conventionsHeading, follow.appearances),
        newBooksSection(settings.newBooksHeading, follow.newBooks),
      ].join('')
    : `<p style="margin:20px 0;color:${MUTED};line-height:1.5;">${escapeHtml(
        settings.emptyFollowsNudge,
      )}</p>`

  // No greeting — we dive straight in (first-name guesses go wrong too often).
  // Order mirrors the masthead: the note, then the Sunday Strips funnies, then
  // the reader's personalized ND Riot updates.
  const body = [
    noteBlock,
    stripsSection(settings.stripsHeading, settings.stripsAllLabel, strips),
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
  )}</title></head><body style="margin:0;padding:0;background:${BG};"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG};"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;font-family:${SANS};color:${FG};"><tr><td><div style="text-align:center;margin:0 0 16px 0;"><img src="${escapeHtml(
    absoluteUrl(LOGO_PATH),
  )}" width="150" alt="ND Riot" style="display:inline-block;width:150px;max-width:150px;height:auto;border:0;" /></div><div style="font-weight:900;letter-spacing:-0.01em;text-transform:uppercase;font-size:20px;line-height:1.2;color:${PINK};margin:0 0 12px 0;">${escapeHtml(
    settings.mastheadTitle,
  )}</div>${body}${footer}</td></tr></table></td></tr></table></body></html>`

  const text = buildText(input, hasFollowContent)
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
  since: string
  unsubscribeUrl: string
}): Promise<{ subject: string; html: string; text: string; hasFollowContent: boolean }> {
  const follow = await fetchFollowContent(params.email, params.since)
  return renderNoiseEmail({
    issue: params.issue,
    settings: params.settings,
    follow,
    strips: params.strips,
    unsubscribeUrl: params.unsubscribeUrl,
  })
}
