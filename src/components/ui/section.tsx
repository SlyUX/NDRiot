import type { ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

/**
 * Layout backbone. Replaces the repeated
 * `py-16 px-6 <bg> / mx-auto max-w-*` pattern across page files.
 *
 * Two layers on purpose: the outer element owns padding/background/border
 * (so backgrounds run full-bleed), the inner div owns the max-width.
 */

const sectionVariants = cva('', {
  variants: {
    background: {
      none: '',
      background: 'bg-background',
      card: 'bg-card',
      muted: 'bg-muted',
      primary: 'bg-primary text-primary-foreground',
    },
    padding: {
      none: '',
      xs: 'px-6 py-4',
      sm: 'px-6 py-8',
      md: 'px-6 py-12',
      lg: 'px-6 py-16',
      hero: 'px-6 pt-32 pb-10',
    },
    border: {
      none: '',
      top: 'border-t',
      bottom: 'border-b',
      both: 'border-y',
    },
  },
  defaultVariants: {
    background: 'none',
    padding: 'lg',
    border: 'none',
  },
})

/**
 * Container widths, narrow to wide.
 *
 * The default is `wide` (1440px), not a text-site width. This is a directory
 * of cover art — a 4-column grid at 1152px gives ~264px cards, which is small
 * for the thing the page exists to show.
 *
 * `2xl`-`4xl` are reading measures, for prose. Long-form uses `3xl` so line
 * length stays sane; a 1440px paragraph is unreadable.
 *
 * Above roughly 1500px viewports every option leaves margins, and that is
 * correct rather than a bug — there is no container width that fills an
 * ultrawide monitor without the content becoming unreadable.
 */
const innerVariants = cva('mx-auto w-full', {
  variants: {
    maxWidth: {
      '2xl': 'max-w-2xl',
      '3xl': 'max-w-3xl',
      '4xl': 'max-w-4xl',
      '6xl': 'max-w-6xl',
      wide: 'max-w-[90rem]',
      full: 'max-w-none',
    },
  },
  defaultVariants: {
    maxWidth: 'wide',
  },
})

export interface SectionProps
  extends VariantProps<typeof sectionVariants>,
    VariantProps<typeof innerVariants> {
  children: ReactNode
  /** Render as a different element. Use `div` when already inside a <section>. */
  as?: 'section' | 'div' | 'aside' | 'header' | 'footer' | 'article'
  /** Anchor target for in-page links. */
  id?: string
  /** Classes for the outer, full-bleed element. */
  className?: string
  /** Classes for the inner, max-width-constrained container. */
  innerClassName?: string
}

export function Section({
  children,
  as: Tag = 'section',
  background,
  padding,
  border,
  maxWidth,
  id,
  className,
  innerClassName,
}: SectionProps) {
  return (
    <Tag
      id={id}
      data-slot="section"
      className={cn(sectionVariants({ background, padding, border }), className)}
    >
      <div className={cn(innerVariants({ maxWidth }), innerClassName)}>{children}</div>
    </Tag>
  )
}

export { sectionVariants }
