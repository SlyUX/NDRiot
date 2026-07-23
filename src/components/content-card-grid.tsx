import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

import { ContentCard, type ContentCardProps } from '@/components/content-card'
import { SectionHeading } from '@/components/section-heading'
import { Section, type SectionProps } from '@/components/ui/section'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

/**
 * Grid of ContentCards with an optional heading and "view all" action.
 *
 * This merges what the reference repo had as two near-identical components
 * (ContentCardGrid and CardRowWithDividers) — they differed only in default
 * column count and a divider flag. See AGENTS.md §4.
 */

export type GridColumns = 1 | 2 | 3 | 4

/**
 * Static map, not interpolation. Tailwind scans source text, so a template
 * literal like `lg:grid-cols-${n}` produces no CSS.
 */
const COLUMN_CLASSES: Record<GridColumns, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
}

export interface ContentCardGridProps {
  cards: ContentCardProps[]
  /** Section title. Omit for an unheaded grid. */
  heading?: string
  /**
   * Heading level. `h2` suits a section inside a page; pass `h1` when the
   * grid *is* the page and nothing else claims the h1 (AGENTS.md §10).
   */
  headingAs?: 'h1' | 'h2' | 'h3'
  headingSize?: 'sm' | 'md' | 'lg'
  subtitle?: string
  layout?: ContentCardProps['layout']
  aspectRatio?: ContentCardProps['aspectRatio']
  columns?: GridColumns
  /** Vertical rules between columns at lg and up. */
  dividers?: boolean
  viewAllHref?: string
  /** Link label. Copy, so it comes from the caller — see AGENTS.md §2. */
  viewAllLabel?: string
  /**
   * Shown when `cards` is empty. Required rather than defaulted: every
   * collection view needs a real empty state (AGENTS.md §8), and a generic
   * default is how that requirement gets quietly skipped.
   */
  emptyMessage: string
  /**
   * Optional controls between the heading and the cards — the homepage puts a
   * filter row here so each row's control sits directly above the row it
   * governs. Rendered above the empty state too, so the filter that emptied a
   * row is still there to loosen.
   */
  toolbar?: React.ReactNode
  /** Forwarded to the Section wrapper. */
  background?: SectionProps['background']
  padding?: SectionProps['padding']
  maxWidth?: SectionProps['maxWidth']
  className?: string
}

export function ContentCardGrid({
  cards,
  heading,
  headingAs,
  headingSize,
  subtitle,
  layout = 'vertical',
  aspectRatio,
  columns = 3,
  dividers = false,
  viewAllHref,
  viewAllLabel,
  emptyMessage,
  toolbar,
  background,
  padding,
  maxWidth,
  className,
}: ContentCardGridProps) {
  const action =
    viewAllHref && viewAllLabel ? (
      <Button variant="ghost" size="sm" asChild>
        <Link href={viewAllHref}>
          {viewAllLabel}
          {/* One chevron. The reference had SectionHeading append its own on
              top of the caller's, so every "view all" rendered two. */}
          <ChevronRight className="ml-1 size-4" />
        </Link>
      </Button>
    ) : undefined

  return (
    <Section background={background} padding={padding} maxWidth={maxWidth} className={className}>
      {(heading || action) && (
        <SectionHeading as={headingAs} size={headingSize} subtitle={subtitle} action={action}>
          {heading}
        </SectionHeading>
      )}

      {toolbar && <div className="mb-6">{toolbar}</div>}

      {cards.length === 0 ? (
        <p className="text-muted-foreground py-8 text-sm">{emptyMessage}</p>
      ) : (
        <div
          className={cn(
            'grid grid-cols-1 gap-6 sm:grid-cols-2',
            COLUMN_CLASSES[columns],
            dividers && 'lg:gap-x-12',
          )}
        >
          {cards.map((card, index) => (
            <div key={card.href} className={cn('relative', dividers && 'lg:pl-6')}>
              {dividers && index > 0 && (
                <Separator
                  orientation="vertical"
                  className="absolute inset-y-0 -left-3 hidden lg:block"
                />
              )}
              <ContentCard
                {...card}
                layout={layout}
                aspectRatio={card.aspectRatio ?? aspectRatio}
                stretch
              />
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}
