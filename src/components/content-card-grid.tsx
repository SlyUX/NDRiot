import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

import { ContentCard, type ContentCardProps } from '@/components/content-card'
import { HorizontalScroller } from '@/components/horizontal-scroller'
import { SaveButton } from '@/components/save-button'
import { SectionHeading } from '@/components/section-heading'
import { SlideOnChange } from '@/components/slide-on-change'
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

export type GridColumns = 1 | 2 | 3 | 4 | 5

/**
 * Static map, not interpolation. Tailwind scans source text, so a template
 * literal like `lg:grid-cols-${n}` produces no CSS.
 *
 * Phone counts come from the layout's base grid (2-up vertical, 1-up
 * horizontal); these set the tablet (sm) and desktop (lg) counts, which run one
 * denser than the phone.
 */
const COLUMN_CLASSES: Record<GridColumns, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'sm:grid-cols-3 lg:grid-cols-3',
  4: 'sm:grid-cols-3 lg:grid-cols-4',
  // Books: 2 up on phones, 4 across the tablet range, 5 on desktop.
  5: 'sm:grid-cols-4 lg:grid-cols-5',
}

/**
 * Card-level Save. Given this, the grid renders a bookmark chip on the cover of
 * every card that carries an itemType + itemId (books, creators). Omit it and
 * cards render exactly as before — Save is opt-in per listing.
 */
export interface CardSaveConfig {
  signedIn: boolean
  savedIds: string[]
  saveLabel: string
  savedLabel: string
  signInCopy: { title: string; body: string; cta: string }
}

export interface ContentCardGridProps {
  cards: ContentCardProps[]
  /** Enable a Save chip on each savable card's cover. */
  save?: CardSaveConfig
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
  /** Forwarded to each card — how many summary lines before clamping. */
  summaryLines?: ContentCardProps['summaryLines']
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
   * Emphasise the empty state — pink, larger, bold — for the filtered
   * no-match case. A reader who narrowed themselves into a dead end should
   * notice the way out ("try loosening one"), where a "nothing here yet" note
   * on an unfiltered page wants the quiet muted treatment.
   */
  emptyEmphasis?: boolean
  /**
   * Optional controls between the heading and the cards — the homepage puts a
   * filter row here so each row's control sits directly above the row it
   * governs. Rendered above the empty state too, so the filter that emptied a
   * row is still there to loosen.
   */
  toolbar?: React.ReactNode
  /**
   * When set, the cards region (not the heading/toolbar) slides in left-to-right
   * whenever this token changes — the homepage passes the row's ordered ids so
   * it animates on a shuffle/filter but stays still for unrelated navigations.
   */
  slideToken?: string
  /** Rendered under the grid, inside the section — e.g. a "Load more" control. */
  footer?: React.ReactNode
  /**
   * Render as a single horizontally-scrolling row instead of a wrapping grid —
   * the homepage's browse rows, where one row is a taste and the rest is a
   * swipe/scroll away.
   */
  scroll?: boolean
  /** Rows the scroller stacks on phones (see HorizontalScroller). */
  scrollRows?: 1 | 2
  /** Forwarded to the Section wrapper. */
  background?: SectionProps['background']
  padding?: SectionProps['padding']
  maxWidth?: SectionProps['maxWidth']
  className?: string
}

export function ContentCardGrid({
  cards,
  save,
  heading,
  headingAs,
  headingSize,
  subtitle,
  layout = 'vertical',
  aspectRatio,
  summaryLines,
  columns = 3,
  dividers = false,
  viewAllHref,
  viewAllLabel,
  emptyMessage,
  emptyEmphasis = false,
  toolbar,
  slideToken,
  footer,
  scroll = false,
  scrollRows = 1,
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
        <p
          className={cn(
            'py-8',
            emptyEmphasis
              ? 'text-primary text-base font-bold sm:text-lg'
              : 'text-muted-foreground text-sm',
          )}
        >
          {emptyMessage}
        </p>
      ) : (
        (() => {
          const gridClassName = cn(
            'grid gap-6',
            // Phones: vertical cards (books) sit two-up before wrapping;
            // horizontal cards (creators) are wide, so one-up. Both ramp up to
            // `columns` at lg.
            layout === 'horizontal' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2',
            COLUMN_CLASSES[columns],
            dividers && 'lg:gap-x-12',
          )
          const cells = cards.map((card, index) => (
            <div
              key={card.href}
              className={cn(
                'relative',
                dividers && 'lg:pl-6',
                // In a scroll row each cell holds a fixed width and snaps —
                // narrow for vertical covers, wider for horizontal list rows.
                scroll && 'shrink-0 snap-start',
                scroll && (layout === 'horizontal' ? 'w-72 sm:w-80' : 'w-40 sm:w-44 lg:w-56'),
              )}
            >
              {dividers && index > 0 && (
                <Separator
                  orientation="vertical"
                  className="absolute inset-y-0 -left-3 hidden lg:block"
                />
              )}
              <ContentCard
                {...card}
                layout={layout}
                summaryLines={summaryLines}
                aspectRatio={card.aspectRatio ?? aspectRatio}
                stretch
              />
              {/* Save chip — a sibling of the card's Link (anchors can't nest a
                  button), pinned to the cover corner. Top-left dodges the
                  maturity badge (top-right); it drops below a funding bar. */}
              {save && card.itemType && card.itemId && (
                <div
                  className={cn(
                    'absolute z-20',
                    layout === 'horizontal'
                      ? 'top-1 left-1'
                      : card.fundingUrl
                        ? 'top-8 left-2'
                        : 'top-2 left-2',
                  )}
                >
                  <SaveButton
                    variant="icon"
                    itemType={card.itemType}
                    itemId={card.itemId}
                    initialSaved={save.savedIds.includes(card.itemId)}
                    signedIn={save.signedIn}
                    saveLabel={save.saveLabel}
                    savedLabel={save.savedLabel}
                    signInCopy={save.signInCopy}
                  />
                </div>
              )}
            </div>
          ))

          // One scrolling row (browse) or a plain wrapping grid.
          const grid = scroll ? (
            <HorizontalScroller rows={scrollRows}>{cells}</HorizontalScroller>
          ) : (
            <div className={gridClassName}>{cells}</div>
          )
          // Slide the cards in when the row is re-rolled (token changes), leaving
          // the heading + toolbar above it untouched.
          return slideToken !== undefined ? (
            <SlideOnChange token={slideToken}>{grid}</SlideOnChange>
          ) : (
            grid
          )
        })()
      )}

      {footer}
    </Section>
  )
}
