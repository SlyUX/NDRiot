'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Info, Plus } from 'lucide-react'

import { toggleCosign } from '@/app/actions/cosign'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * Cosign — a signed-in creator's public endorsement of ANOTHER creator (the page
 * renders this only for that case; never on your own profile, never to readers).
 * Toggles the target in the endorser's `favoriteCreators`; optimistic, reconciles
 * with the server. The (i) icon opens a tooltip explaining the feature (§2 copy).
 */
export function CosignButton({
  targetId,
  initialCosigned,
  cosignLabel,
  cosignedLabel,
  infoLabel,
  tooltip,
}: {
  targetId: string
  initialCosigned: boolean
  cosignLabel: string
  cosignedLabel: string
  infoLabel: string
  tooltip: string
}) {
  const [cosigned, setCosigned] = useState(initialCosigned)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function onClick() {
    const next = !cosigned
    setCosigned(next) // optimistic
    startTransition(async () => {
      const result = await toggleCosign(targetId)
      if (result.ok) {
        setCosigned(result.cosigned ?? next)
        router.refresh()
      } else {
        setCosigned(!next) // revert
      }
    })
  }

  return (
    <TooltipProvider>
      <span className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={onClick}
          disabled={pending}
          aria-pressed={cosigned}
          className={cn(
            'focus-visible:ring-ring inline-flex items-center gap-1.5 border px-3 py-2 text-xs font-bold tracking-widest uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60',
            cosigned
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-primary/60 text-primary hover:bg-primary/10',
          )}
        >
          {cosigned ? (
            <Check aria-hidden="true" className="size-4" />
          ) : (
            <Plus aria-hidden="true" className="size-4" />
          )}
          {cosigned ? cosignedLabel : cosignLabel}
        </button>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={infoLabel}
              className="text-muted-foreground hover:text-primary focus-visible:ring-ring inline-flex transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <Info aria-hidden="true" className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      </span>
    </TooltipProvider>
  )
}
