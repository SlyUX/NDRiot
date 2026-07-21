import Image from 'next/image'
import { cva, type VariantProps } from 'class-variance-authority'

import { urlFor } from '@/sanity/image'
import { cn } from '@/lib/utils'
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
  className?: string
}

export function OrganizationLink({ organization, size, className }: OrganizationLinkProps) {
  const { name, website, logo } = organization

  const content = logo ? (
    <Image
      src={urlFor(logo).width(320).url()}
      /*
       * The name, not the image's own alt — and deliberately not empty.
       *
       * Elsewhere a blank alt is right, because the image sits beside a title
       * that already names it. Here the logo REPLACES the name: leave it
       * blank and the organization vanishes for a screen reader, taking the
       * link's accessible name with it. `||` rather than `??` so an editor
       * saving an empty alt still gets the name.
       */
      alt={logo.alt || name}
      width={320}
      height={160}
      className={cn(logoVariants({ size }))}
    />
  ) : (
    <span className={cn(textVariants({ size }))}>{name}</span>
  )

  if (!website) {
    return <span className={cn('inline-flex items-center', className)}>{content}</span>
  }

  return (
    <a
      href={website}
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
