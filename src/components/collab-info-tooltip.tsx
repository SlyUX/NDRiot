'use client'

import { Info } from 'lucide-react'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

/**
 * An (ⓘ) info trigger next to the Collaborations tab — the explanation that used
 * to sit under the heading now lives here, on hover or tap. The text is also the
 * button's accessible name, so screen readers get it without the tooltip.
 */
export function CollabInfoTooltip({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={text}
            className="text-muted-foreground hover:text-primary focus-visible:ring-ring inline-flex rounded-full p-0.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <Info aria-hidden="true" className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent>{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
