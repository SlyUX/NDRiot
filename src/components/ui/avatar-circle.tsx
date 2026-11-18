import { cn } from '@/lib/utils'

/**
 * A round avatar — the creator's photo if present, else their initial. Takes a
 * pre-built image URL (the server resolves `urlFor`), so it's client-safe. Round
 * is the sanctioned app-layer exception to square corners (§9). Size via
 * `className` (e.g. `size-9`).
 */
export function AvatarCircle({
  src,
  name,
  className,
}: {
  src: string | null
  name: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'bg-card text-muted-foreground relative inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full',
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
      ) : (
        <span className="text-xs font-black uppercase">{name.trim()[0] ?? '?'}</span>
      )}
    </span>
  )
}
