import Image from 'next/image'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

/**
 * The ND Riot lockup.
 *
 * A repo asset rather than a Sanity image — this is brand identity, not
 * content. An editor swapping the logo is a mistake, not a workflow, so it
 * deliberately has no CMS field (a stated AGENTS.md §2 exception).
 *
 * One SVG at two sizes rather than two files. The mark is legible small, and
 * a second asset is a second thing to keep in sync.
 *
 * The file's fill is the `--primary` pink. If the token ever changes, the SVG
 * changes with it — that pairing is not automatic, so check both.
 */

const logoVariants = cva('w-auto', {
  variants: {
    size: {
      // Sized so the lockup clears the nav bar without crowding it.
      nav: 'h-8 sm:h-9',
      // Arbitrary values rather than scale steps: these are exactly 30% up
      // from 8/11/16rem. The nearest steps would have landed at ~25%, and a
      // logo is not on the spacing grid, so precision wins over rhythm here.
      hero: 'h-[10.4rem] sm:h-[14.3rem] lg:h-[20.8rem]',
    },
  },
  defaultVariants: { size: 'nav' },
})

export interface LogoProps extends VariantProps<typeof logoVariants> {
  /**
   * Accessible name. Empty string when the logo sits inside a link that is
   * already labelled, or beside a visible wordmark — otherwise a screen
   * reader hears the brand twice.
   */
  alt?: string
  className?: string
  priority?: boolean
}

export function Logo({ size, alt = 'ND Riot', className, priority = false }: LogoProps) {
  return (
    <Image
      src="/nd-riot-logo.svg"
      alt={alt}
      // Matches the file's viewBox (1283.6 x 823.82), rounded. `h-*` classes
      // drive the rendered size; these exist so Next can reserve the right
      // space and avoid layout shift. Wrong values here skew the aspect.
      width={1284}
      height={824}
      priority={priority}
      // Required: Next blocks SVG through the image optimizer unless this or
      // `dangerouslyAllowSVG` is set, and without it the image simply fails to
      // render. `unoptimized` is the narrow fix — the config flag would open
      // the optimizer to every SVG including remote ones, and needs a CSP to
      // be safe. A local vector has nothing to gain from optimization anyway.
      unoptimized
      className={cn(logoVariants({ size }), className)}
    />
  )
}
