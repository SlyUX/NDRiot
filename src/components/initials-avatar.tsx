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
 * The no-avatar fallback for a creator — their initials hand-lettered (Permanent
 * Marker) on the site's charcoal surface (white 12.4:1, §9). A missing photo
 * then reads as a deliberate punk tag rather than a broken box. Fills its
 * container; the caller sizes the letters via `className` (defaults to text-2xl).
 * Decorative — the name always sits beside it, so aria-hidden.
 */
export function InitialsAvatar({
  name,
  className,
}: {
  name: string
  className?: string
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'bg-charcoal text-foreground font-marker flex h-full w-full items-center justify-center leading-none tracking-wide select-none',
        'text-2xl',
        className,
      )}
    >
      {initials(name)}
    </div>
  )
}
