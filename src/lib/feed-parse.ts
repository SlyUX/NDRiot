import { XMLParser } from 'fast-xml-parser'

/**
 * Server-side RSS/Atom feed fetching + parsing.
 *
 * Used two ways: the Studio's feed-URL validation (via /api/feed-check) and the
 * profile-page display of an outlet's or creator's latest items. Both run on
 * the server — the Studio can't fetch a third-party feed itself (CORS), and a
 * feed server won't send permissive headers anyway.
 *
 * Everything here fails soft: any network error, non-feed response, or malformed
 * XML returns `null`, so a dead or moved feed simply shows nothing rather than
 * throwing. `fast-xml-parser` hands back untyped structures, so this normalizes
 * RSS 2.0, RSS 1.0/RDF, and Atom into one small shape through `unknown`-safe
 * accessors (no `any`, per AGENTS.md §7).
 */

export interface FeedEntry {
  title: string
  /** Absolute link to the item, as given by the feed. */
  link: string
  /** ISO 8601, or null when the feed omits/malforms the date. */
  date: string | null
  /** Plain-text item summary — HTML tags and entities stripped out — or null
   *  when the feed item carries no description. The display truncates it. */
  summary: string | null
}

export interface ParsedFeed {
  title: string | null
  entries: FeedEntry[]
}

const FETCH_TIMEOUT_MS = 5000
const MAX_BYTES = 2_000_000

/**
 * Only fetch public http(s) hosts. A blunt block on loopback/private-range
 * literals — a first line against using this server to probe internal services
 * (SSRF). It does not resolve DNS, so it is not complete protection; the field
 * is editor-entered in the authenticated Studio, which bounds the exposure.
 */
function safePublicUrl(raw: string): URL | null {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host.endsWith('.localhost')) return null
  if (host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) {
    return null
  }
  if (/^(0\.|127\.|10\.|169\.254\.|192\.168\.)/.test(host)) return null
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return null
  return url
}

export async function fetchFeed(
  rawUrl: string,
  { revalidate }: { revalidate?: number } = {},
): Promise<ParsedFeed | null> {
  const url = safePublicUrl(rawUrl)
  if (!url) return null

  let response: Response
  try {
    response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        'User-Agent': 'NDRiotFeedReader/1.0 (+https://ndriot.com)',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
      // The validation route wants a live check; the display wants a cached one.
      ...(revalidate ? { next: { revalidate } } : { cache: 'no-store' }),
    })
  } catch {
    return null
  }
  if (!response.ok) return null

  const body = await response.text()
  if (body.length > MAX_BYTES) return null
  return parseFeed(body)
}

/* ------------------------------------------------------------ parsing */

type Json = unknown

function asRecord(value: Json): Record<string, Json> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, Json>)
    : null
}

/** A feed's repeated nodes parse as a single object when there's one, array when many. */
function asArray(value: Json): Json[] {
  if (Array.isArray(value)) return value
  return value == null ? [] : [value]
}

/** Text can be a bare string, a number, or `{ '#text': '…' }` when it carries attributes. */
function asText(value: Json): string | null {
  if (typeof value === 'string') return value.trim() || null
  if (typeof value === 'number') return String(value)
  const record = asRecord(value)
  const inner = record?.['#text']
  if (typeof inner === 'string') return inner.trim() || null
  if (typeof inner === 'number') return String(inner)
  return null
}

function normalizeDate(raw: string | null): string | null {
  if (!raw) return null
  const ms = Date.parse(raw)
  return Number.isNaN(ms) ? null : new Date(ms).toISOString()
}

/** The handful of HTML entities a feed summary commonly carries beyond the five
 *  XML ones the parser already resolves. Numeric entities decode generically. */
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  mdash: '—', ndash: '–', hellip: '…', rsquo: '’', lsquo: '‘',
  ldquo: '“', rdquo: '”', trade: '™', copy: '©', reg: '®',
}

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z][a-z0-9]*);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const n =
        code[1] === 'x' || code[1] === 'X'
          ? parseInt(code.slice(2), 16)
          : parseInt(code.slice(1), 10)
      return Number.isFinite(n) ? String.fromCodePoint(n) : match
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? match
  })
}

/**
 * A feed's description/summary is HTML (often CDATA-wrapped). Reduce it to plain
 * text for a short preview: drop tags, decode the common entities, collapse
 * whitespace. Rendered as text in React, so this is for legibility, not safety.
 */
function htmlToText(raw: string | null): string | null {
  if (!raw) return null
  const text = decodeEntities(raw.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    // A stripped inline tag can leave a space before punctuation ("markup .").
    .replace(/\s+([.,;:!?)])/g, '$1')
    .trim()
  return text || null
}

/** RSS 2.0 / RDF item: link is text; date is pubDate or dc:date. */
function rssEntry(value: Json): FeedEntry | null {
  const item = asRecord(value)
  if (!item) return null
  const title = asText(item.title)
  const link = asText(item.link)
  if (!title || !link) return null
  return {
    title,
    link,
    date: normalizeDate(asText(item.pubDate) ?? asText(item['dc:date'])),
    summary: htmlToText(asText(item.description)),
  }
}

/** Atom link is `<link href rel>` — one or many; prefer rel="alternate". */
function atomLink(value: Json): string | null {
  const links = asArray(value)
    .map(asRecord)
    .filter((l): l is Record<string, Json> => l !== null)
  const chosen =
    links.find((l) => l['@_rel'] === 'alternate') ??
    links.find((l) => l['@_rel'] === undefined) ??
    links[0]
  const href = chosen?.['@_href']
  return typeof href === 'string' ? href.trim() || null : null
}

function atomEntry(value: Json): FeedEntry | null {
  const entry = asRecord(value)
  if (!entry) return null
  const title = asText(entry.title)
  const link = atomLink(entry.link)
  if (!title || !link) return null
  return {
    title,
    link,
    date: normalizeDate(asText(entry.updated) ?? asText(entry.published)),
    summary: htmlToText(asText(entry.summary) ?? asText(entry.content)),
  }
}

export function parseFeed(xml: string): ParsedFeed | null {
  let doc: Json
  try {
    doc = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', trimValues: true }).parse(
      xml,
    )
  } catch {
    return null
  }
  const root = asRecord(doc)
  if (!root) return null

  // RSS 2.0
  const channel = asRecord(root.rss ? asRecord(root.rss)?.channel : null)
  if (channel) {
    return {
      title: asText(channel.title),
      entries: asArray(channel.item)
        .map(rssEntry)
        .filter((e): e is FeedEntry => e !== null),
    }
  }

  // RSS 1.0 / RDF — items sit at the RDF root, channel holds the title.
  const rdf = asRecord(root['rdf:RDF'])
  if (rdf) {
    return {
      title: asText(asRecord(rdf.channel)?.title),
      entries: asArray(rdf.item)
        .map(rssEntry)
        .filter((e): e is FeedEntry => e !== null),
    }
  }

  // Atom
  const feed = asRecord(root.feed)
  if (feed) {
    return {
      title: asText(feed.title),
      entries: asArray(feed.entry)
        .map(atomEntry)
        .filter((e): e is FeedEntry => e !== null),
    }
  }

  return null
}
