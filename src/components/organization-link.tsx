import Image from 'next/image'
import { cva, type VariantProps } from 'class-variance-authority'

import { urlFor } from '@/sanity/image'
import { cn, externalHref } from '@/lib/utils'
import type { Organization } from '@/lib/types'

/**
 * An organization or studio — its logo if it has one, its name if it does not.
 *
 * Text is the fallback rather than a generated placeholder. Initials are the
 * usual answer, but "NI" tells a reader nothing that "Nash Illustrators"
 * does not tell them better, and a placeholder box reads as a missing asset.
 * A name in text is simply the right answer at a smaller size.
 *
 * Logos are constrained by height with width auto, because logo aspect
 * ratios are unknowable — a wordmark and a roundel share no proportions.
 * `max-w` stops an extreme wordmark from running across the column.
 */

const logoVariants = cva('w-auto object-contain', {
  variants: {
    size: {
      sm: 'h-6 max-w-32',
      md: 'h-8 max-w-40',
    },
  },
  defaultVariants: { size: 'sm' },
})

const textVariants = cva('font-bold tracking-wide uppercase', {
  variants: {
    size: {
      sm: 'text-sm',
      md: 'text-base',
    },
  },
  defaultVariants: { size: 'sm' },
})

export interface OrganizationLinkProps extends VariantProps<typeof logoVariants> {
  organization: Organization
  /**
   * `auto` shows the logo when the organization has one.
   *
   * `text` forces the name even when a logo exists — for places where the
   * logo would collide with nearby artwork. A creator's studio sits directly
   * under their portrait, and when the studio's mark IS that portrait, the
   * logo appears twice within a few pixels.
   *
   * `badge` shows the logo inside a circular frame — a deliberate exception to
   * the square-corner rule (§9), for the "member of" row where round marks read
   * as membership badges. An org without a logo still falls back to text.
   */
  display?: 'auto' | 'text' | 'badge'
  className?: string
}

export function OrganizationLink({
  organization,
  size,
  display = 'auto',
  className,
}: OrganizationLinkProps) {
  const { name, website, logo } = organization
  // The alt is the name, not the image's own — the logo REPLACES the name, so a
  // blank alt would make the organization vanish for a screen reader. `||`, so
  // an editor who saved an empty alt still gets the name.
  const alt = logo ? logo.alt || name : name

  let content
  if (display === 'badge' && logo) {
    // Circular logo badge. No padding — a square/badge-style mark fills the
    // disc edge to edge. object-contain (not cover) so a non-square logo is
    // shown whole rather than cropped.
    content = (
      <span className="border-foreground/20 bg-background flex size-20 items-center justify-center overflow-hidden rounded-full border">
        <Image
          src={urlFor(logo).width(240).url()}
          alt={alt}
          width={240}
          height={240}
          className="h-auto max-h-full w-auto max-w-full object-contain"
        />
      </span>
    )
  } else if (display === 'auto' && logo) {
    content = (
      <Image
        src={urlFor(logo).width(320).url()}
        alt={alt}
        width={320}
        height={160}
        className={cn(logoVariants({ size }))}
      />
    )
  } else {
    content = <span className={cn(textVariants({ size }))}>{name}</span>
  }

  if (!website) {
    return <span className={cn('inline-flex items-center', className)}>{content}</span>
  }

  return (
    <a
      href={externalHref(website)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'text-primary hover:text-primary/80 focus-visible:ring-ring inline-flex items-center transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:outline-none',
        className,
      )}
    >
      {content}
    </a>
  )
}
