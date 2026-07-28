import 'server-only'

import { headers } from 'next/headers'

/**
 * Shared anti-spam primitives for intake server actions.
 *
 * Ported from the contact action (src/app/actions/contact.ts), which proved the
 * shape in production: an off-screen honeypot, a mount-time timing gate, and a
 * best-effort per-IP rate limit. Intake reuses all three, because the stakes
 * are higher here — a bot now creates a draft *document*, not just a dropped
 * email — so the same gates matter more, not less (native-intake brief, Risks).
 *
 * The contact action keeps its own inline copy for now; duplicating three small
 * functions is cheaper than refactoring a working production path, and this
 * module is where a future shared store (Vercel KV / Upstash) would land.
 */

/**
 * Honeypot: a field hidden from people but tempting to bots. A value means a
 * bot. The caller returns a *silent* success on a trip — telling a bot it was
 * caught just teaches it to adapt.
 */
export function honeypotTripped(formData: FormData, field = 'company'): boolean {
  return Boolean(String(formData.get(field) ?? ''))
}

/**
 * Timing gate: the render time is stamped into a hidden field at mount. A
 * submission faster than a person could plausibly complete the form is a
 * script. Empty (no-JS, the field never got stamped) → not applied, matching
 * the contact form — the honeypot still covers that path.
 */
export function submittedTooFast(formData: FormData, field = 't', minMs = 2_000): boolean {
  const started = Number(formData.get(field))
  return Number.isFinite(started) && Date.now() - started < minMs
}

/**
 * Best-effort, in-memory, per-instance rate limit — a backstop behind the
 * honeypot and timing gate. On serverless it only catches a bot hammering one
 * warm instance; real protection needs a shared store, the noted follow-up if
 * abuse appears. Keyed by bucket so intake and any other caller never share a
 * budget.
 */
const hits = new Map<string, number[]>()

export async function rateLimited(
  bucket: string,
  max = 5,
  windowMs = 10 * 60_000,
): Promise<boolean> {
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const key = `${bucket}:${ip}`
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
  recent.push(now)
  hits.set(key, recent)
  return recent.length > max
}
