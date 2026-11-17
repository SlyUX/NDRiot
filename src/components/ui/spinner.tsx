import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * A small inline loading spinner for pending actions. Inherits `currentColor`,
 * so it reads correctly on any button. Respects reduced motion (it simply stops
 * spinning; the disabled state still signals "working"). Decorative — the
 * surrounding control keeps its accessible name.
 */
export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2
      aria-hidden="true"
      className={cn('size-4 animate-spin motion-reduce:animate-none', className)}
    />
  )
}
