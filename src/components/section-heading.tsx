import type { ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

/**
 * Section title with optional subtitle and a trailing action slot.
 *
 * Note for anyone diffing against the reference implementation: that version
 * branched into two render modes and accidentally used a different font
 * weight and size in each (`font-black text-3xl` vs `font-extrabold
 * text-2xl md:text-3xl`). That was drift, not design. This renders one
 * consistent heading and lets `size` do the varying.
 */

const headingVariants = cva('font-black tracking-tighter', {
  variants: {
    size: {
      sm: 'text-xs tracking-widest',
      md: 'text-2xl md:text-3xl',
      lg: 'text-3xl md:text-4xl',
    },
    tone: {
      default: 'text-foreground',
      primary: 'text-primary',
    },
    uppercase: {
      true: 'uppercase',
      false: '',
    },
  },
  defaultVariants: {
    size: 'md',
    tone: 'default',
    uppercase: true,
  },
})

export interface SectionHeadingProps extends VariantProps<typeof headingVariants> {
  /** The title. ReactNode so callers can emphasise a fragment. */
  children: ReactNode
  /** Optional supporting line beneath the title. */
  subtitle?: string
  /** Trailing element — a "View all" link, a filter, etc. */
  action?: ReactNode
  align?: 'left' | 'center'
  /** Heading level. Use `h1` only for page titles; never skip levels. */
  as?: 'h1' | 'h2' | 'h3'
  className?: string
}

export function SectionHeading({
  children,
  subtitle,
  action,
  align = 'left',
  as: Tag = 'h2',
  size,
  tone,
  uppercase,
  className,
}: SectionHeadingProps) {
  const centered = align === 'center'

  return (
    <div
      data-slot="section-heading"
      className={cn(
        'mb-8 gap-4',
        centered
          ? 'flex flex-col items-center text-center'
          : 'flex flex-wrap items-end justify-between',
        className,
      )}
    >
      <div className={cn(centered && 'flex flex-col items-center')}>
        <Tag className={cn(headingVariants({ size, tone, uppercase }))}>{children}</Tag>
        {subtitle && (
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export { headingVariants }
