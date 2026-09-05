import { cn } from '@/lib/utils'

/** Up to two initials from a name — first + last word. "S.K. Madden" → "SM". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return '?'
  const first = words[0][0] ?? ''
  const last = words.length > 1 ? (words[words.length - 1][0] ?? '') : ''
  return (first + last).toUpperCase()
}

/**
 * The no-avatar fallback — initials hand-lettered (Permanent Marker) as a
 * deliberate punk tag rather than a broken box. Fills its container; the caller
 * sizes the letters via `className` (defaults to text-2xl). Decorative — the
 * name always sits beside it, so aria-hidden.
 *
 * `default` tone: white on the charcoal surface (12.4:1, §9) — creators.
 * `brand` tone: black on pink (5.69:1, §9) — conventions without a logo, so a
 * logo-less show still reads as a branded plate.
 */
export function InitialsAvatar({
  name,
  tone = 'default',
  className,
}: {
  name: string
  tone?: 'default' | 'brand'
  className?: string
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'font-marker flex h-full w-full items-center justify-center leading-none tracking-wide select-none',
        tone === 'brand'
          ? 'bg-primary text-primary-foreground'
          : 'bg-charcoal text-foreground',
        'text-2xl',
        className,
      )}
    >
      {initials(name)}
    </div>
  )
}
