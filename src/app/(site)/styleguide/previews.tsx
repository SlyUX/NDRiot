import type { ReactNode } from 'react'

import { ContentCard } from '@/components/content-card'
import { ContentCardGrid } from '@/components/content-card-grid'
import { GenreBadge } from '@/components/genre-badge'
import { SectionHeading } from '@/components/section-heading'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Section } from '@/components/ui/section'
import { Separator } from '@/components/ui/separator'
import type { ContentCardProps } from '@/components/content-card'

/**
 * Live demos, keyed by the `id` in registry.ts.
 *
 * A plain record, not a switch — the reference repo's single 1,476-line switch
 * was the one part of its styleguide worth restructuring. Splitting by category
 * is the next step if this outgrows one file.
 *
 * Note every demo renders with `image` omitted: there is no content in the
 * dataset yet, so these double as the missing-image case.
 */

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-6 last:mb-0">
      <p className="text-muted-foreground mb-3 text-[10px] tracking-widest uppercase">{label}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}

const sampleCard: ContentCardProps = {
  title: 'The Long Con',
  href: '#',
  imageAlt: '',
  eyebrow: 'Ada Verne',
  genres: ['Sci-Fi', 'Horror'],
  format: 'Zine',
  maturity: 'Mature',
  summary: 'A grifter wakes up in a bunker eight years after the apocalypse that never happened.',
  date: '12 Mar 2026',
}

export const previews: Record<string, ReactNode> = {
  button: (
    <>
      <Row label="Variants">
        <Button>Back on Kickstarter</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
        <Button variant="destructive">Destructive</Button>
      </Row>
      <Row label="Sizes">
        <Button size="sm">Small</Button>
        <Button>Default</Button>
        <Button size="lg">Large</Button>
      </Row>
      <Row label="Disabled">
        <Button disabled>Disabled</Button>
      </Row>
    </>
  ),

  badge: (
    <Row label="Variants">
      <Badge>Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="destructive">Destructive</Badge>
    </Row>
  ),

  card: (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>Card title</CardTitle>
        <CardDescription>Supporting description text.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          Compose subcomponents rather than growing a prop list past about seven.
        </p>
      </CardContent>
    </Card>
  ),

  separator: (
    <>
      <Row label="Horizontal">
        <div className="w-full max-w-sm">
          <p className="text-sm">Above</p>
          <Separator className="my-3" />
          <p className="text-sm">Below</p>
        </div>
      </Row>
      <Row label="Vertical">
        <div className="flex h-8 items-center gap-3">
          <span className="text-sm">Left</span>
          <Separator orientation="vertical" />
          <span className="text-sm">Right</span>
        </div>
      </Row>
    </>
  ),

  section: (
    <div className="space-y-px">
      <Section background="card" padding="xs" maxWidth="full">
        <p className="text-xs">background=&quot;card&quot; padding=&quot;xs&quot;</p>
      </Section>
      <Section background="muted" padding="xs" maxWidth="full">
        <p className="text-xs">background=&quot;muted&quot;</p>
      </Section>
      <Section background="primary" padding="xs" maxWidth="full">
        <p className="text-xs">background=&quot;primary&quot; — text flips to black automatically</p>
      </Section>
    </div>
  ),

  'section-heading': (
    <>
      <Row label="Sizes">
        <div className="w-full space-y-6">
          <SectionHeading size="sm">Small — the eyebrow</SectionHeading>
          <SectionHeading size="md">Medium — the default</SectionHeading>
          <SectionHeading size="lg">Large — page titles</SectionHeading>
        </div>
      </Row>
      <Row label="With subtitle and action">
        <div className="w-full">
          <SectionHeading
            subtitle="Optional supporting line that explains the section."
            action={
              <Button variant="ghost" size="sm">
                View all
              </Button>
            }
          >
            Books
          </SectionHeading>
        </div>
      </Row>
      <Row label="Tone">
        <div className="w-full">
          <SectionHeading size="sm" tone="primary">
            Primary tone
          </SectionHeading>
        </div>
      </Row>
    </>
  ),

  'genre-badge': (
    <>
      <Row label="Variants">
        <GenreBadge genre="Sci-Fi" />
        <GenreBadge genre="Horror" variant="outline" />
        <GenreBadge genre="Memoir &amp; Autobio" variant="overlay" noLink />
      </Row>
      <Row label="Sizes">
        <GenreBadge genre="Crime &amp; Noir" size="sm" />
        <GenreBadge genre="Punk &amp; Protest" size="md" />
      </Row>
    </>
  ),

  'content-card': (
    <>
      <Row label="Vertical — the grid default">
        <div className="w-48">
          <ContentCard {...sampleCard} />
        </div>
      </Row>
      <Row label="Horizontal — lists and editorial">
        <div className="w-full max-w-lg">
          <ContentCard {...sampleCard} layout="horizontal" aspectRatio="video" />
        </div>
      </Row>
      <Row label="Overlay — homepage features">
        <div className="w-56">
          <ContentCard {...sampleCard} layout="overlay" aspectRatio="portrait" />
        </div>
      </Row>
    </>
  ),

  'content-card-grid': (
    <>
      <ContentCardGrid
        heading="With cards"
        headingSize="sm"
        cards={[sampleCard, { ...sampleCard, title: 'Second Book' }, { ...sampleCard, title: 'Third Book' }]}
        columns={3}
        padding="none"
        maxWidth="full"
        viewAllHref="#"
        viewAllLabel="View all"
        emptyMessage="Unused here."
      />
      <Separator className="my-8" />
      <ContentCardGrid
        heading="Empty state"
        headingSize="sm"
        cards={[]}
        padding="none"
        maxWidth="full"
        emptyMessage="No books yet — add creators and books in the Studio."
      />
    </>
  ),
}
