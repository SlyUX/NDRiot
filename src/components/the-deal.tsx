import { cn } from '@/lib/utils'

/**
 * "The deal" — the plain-terms reassurance a wary creator needs *before* they
 * commit: it's free, no rights grab, nothing exclusive, we link rather than
 * host or sell. Shown across the Join flow so trust is spoken, not inferred.
 * Copy is Sanity's (settings.join.terms, §2).
 */
export function TheDeal({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn('border-primary bg-charcoal border-l-4 p-4 sm:p-5', className)}>
      <p className="text-foreground text-sm leading-relaxed sm:text-base">{text}</p>
    </div>
  )
}
