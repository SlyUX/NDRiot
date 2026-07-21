/**
 * Component registry for /styleguide.
 *
 * AGENTS.md §2 exception: everything here is developer-facing documentation,
 * not reader-facing content. It describes the code, so it lives with the code
 * and is not CMS-managed.
 *
 * Adding a component takes two steps, joined by `id`:
 *   1. an entry here
 *   2. a matching key in `previews.tsx`
 * A registry entry with no preview renders its docs and a "no preview" note,
 * which is a deliberate soft failure — docs shouldn't disappear because a demo
 * is missing.
 */

export type ComponentCategory = 'foundations' | 'primitives' | 'composed'

export interface PropEntry {
  name: string
  type: string
  default?: string
  description: string
}

export interface ComponentEntry {
  /** Anchor id, and the key that links this entry to its preview. */
  id: string
  name: string
  importPath: string
  description: string
  category: ComponentCategory
  props: PropEntry[]
}

export const categoryLabels: Record<ComponentCategory, string> = {
  foundations: 'Foundations',
  primitives: 'Primitives',
  composed: 'Composed',
}

export const componentEntries: ComponentEntry[] = [
  {
    id: 'button',
    name: 'Button',
    importPath: "@/components/ui/button",
    description:
      'shadcn primitive. Use asChild to render a link that looks like a button rather than nesting an <a> inside a <button>.',
    category: 'primitives',
    props: [
      {
        name: 'variant',
        type: "'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link'",
        default: "'default'",
        description: 'default is the pink CTA. Its label is black — white fails AA on pink.',
      },
      {
        name: 'size',
        type: "'default' | 'sm' | 'lg' | 'icon'",
        default: "'default'",
        description: 'Height and padding only; type size follows.',
      },
      {
        name: 'asChild',
        type: 'boolean',
        default: 'false',
        description: 'Render the child element instead of a <button>. Use for Link and <a>.',
      },
    ],
  },
  {
    id: 'badge',
    name: 'Badge',
    importPath: '@/components/ui/badge',
    description: 'Small label. Prefer GenreBadge for genres so links stay consistent.',
    category: 'primitives',
    props: [
      {
        name: 'variant',
        type: "'default' | 'secondary' | 'outline' | 'destructive'",
        default: "'default'",
        description: 'default is pink with black text.',
      },
    ],
  },
  {
    id: 'card',
    name: 'Card',
    importPath: '@/components/ui/card',
    description:
      'Composition primitive: Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter. Compose subcomponents rather than growing a prop list.',
    category: 'primitives',
    props: [
      {
        name: 'className',
        type: 'string',
        description: 'Merged via cn(), so consumer classes beat defaults.',
      },
    ],
  },
  {
    id: 'separator',
    name: 'Separator',
    importPath: '@/components/ui/separator',
    description: 'Radix separator. Vertical needs a height from its container.',
    category: 'primitives',
    props: [
      {
        name: 'orientation',
        type: "'horizontal' | 'vertical'",
        default: "'horizontal'",
        description: 'Vertical is used for the ContentCardGrid dividers.',
      },
      {
        name: 'decorative',
        type: 'boolean',
        default: 'true',
        description: 'true hides it from assistive tech. Set false only if it conveys meaning.',
      },
    ],
  },
  {
    id: 'section',
    name: 'Section',
    importPath: '@/components/ui/section',
    description:
      'Layout backbone. Two layers: the outer element carries background and padding full-bleed, the inner div carries max-width. Replaces repeated py-16 px-6 / mx-auto max-w-6xl.',
    category: 'primitives',
    props: [
      {
        name: 'background',
        type: "'none' | 'background' | 'card' | 'muted' | 'primary'",
        default: "'none'",
        description: 'primary also flips text to primary-foreground so contrast stays valid.',
      },
      {
        name: 'padding',
        type: "'none' | 'xs' | 'sm' | 'md' | 'lg' | 'hero'",
        default: "'lg'",
        description: 'Vertical rhythm. none when the parent already pads.',
      },
      {
        name: 'maxWidth',
        type: "'2xl' | '3xl' | '4xl' | '6xl' | 'full'",
        default: "'6xl'",
        description: 'full when an ancestor already constrains width.',
      },
      {
        name: 'border',
        type: "'none' | 'top' | 'bottom' | 'both'",
        default: "'none'",
        description: 'Hairline rules between stacked sections.',
      },
      {
        name: 'as',
        type: "'section' | 'div' | 'aside' | 'header' | 'footer'",
        default: "'section'",
        description: 'Keep the landmark honest — div when nested inside another section.',
      },
    ],
  },
  {
    id: 'section-heading',
    name: 'SectionHeading',
    importPath: '@/components/section-heading',
    description:
      'Title with optional subtitle and a trailing action slot. One consistent style; size does the varying.',
    category: 'composed',
    props: [
      {
        name: 'as',
        type: "'h1' | 'h2' | 'h3'",
        default: "'h2'",
        description: 'h1 only when this is the page title. Never skip levels.',
      },
      {
        name: 'size',
        type: "'sm' | 'md' | 'lg'",
        default: "'md'",
        description: 'sm is the small caps eyebrow used above card rows.',
      },
      {
        name: 'tone',
        type: "'default' | 'primary'",
        default: "'default'",
        description: 'primary tints the heading pink.',
      },
      {
        name: 'uppercase',
        type: 'boolean',
        default: 'true',
        description: 'The punk default. Turn off for long headings.',
      },
      { name: 'subtitle', type: 'string', description: 'Supporting line beneath the title.' },
      { name: 'action', type: 'ReactNode', description: 'Trailing slot — usually a view-all link.' },
      { name: 'align', type: "'left' | 'center'", default: "'left'", description: 'Alignment.' },
    ],
  },
  {
    id: 'genre-badge',
    name: 'GenreBadge',
    importPath: '@/components/genre-badge',
    description:
      'A book genre, linked to its category page. Genres come from the fixed list in lib/taxonomy.ts; the href carries the encoded original to match GENRE_BOOKS_QUERY.',
    category: 'composed',
    props: [
      {
        name: 'genre',
        type: 'string',
        description:
          'Typed as string, not Genre — the categories page passes a decoded URL segment, which is a string at that boundary.',
      },
      {
        name: 'variant',
        type: "'default' | 'outline' | 'overlay'",
        default: "'default'",
        description: 'overlay is translucent, for sitting on cover art.',
      },
      { name: 'size', type: "'sm' | 'md'", default: "'sm'", description: 'sm is uppercase micro.' },
      {
        name: 'noLink',
        type: 'boolean',
        default: 'false',
        description: "Skip the link — on that genre's own page, or inside another link.",
      },
    ],
  },
  {
    id: 'content-card',
    name: 'ContentCard',
    importPath: '@/components/content-card',
    description:
      'The one card. Books, creators, columns, interviews and downloads all render through this. Needs a new surface? Add a layout here rather than forking a second card.',
    category: 'composed',
    props: [
      { name: 'title', type: 'string', description: 'Required.' },
      { name: 'href', type: 'string', description: 'Required. The whole card is the link.' },
      { name: 'image', type: 'SanityImage', description: 'Omit to render the muted placeholder.' },
      {
        name: 'imageAlt',
        type: 'string',
        description: "Fallback only — the image's own alt from Sanity wins. '' means decorative.",
      },
      { name: 'eyebrow', type: 'string', description: 'Small line above the title.' },
      {
        name: 'genres',
        type: 'Genre[]',
        description: 'Up to three, rendered as unlinked GenreBadges (the card is already a link).',
      },
      { name: 'format', type: 'BookFormat', description: 'Outline badge beside the genres.' },
      {
        name: 'maturity',
        type: 'MaturityRating',
        description:
          'Overlays the thumbnail, top right. Mature gets solid pink; the rest get an opaque dark surface so they stay legible over any cover art.',
      },
      { name: 'summary', type: 'string', description: 'Clamped to two lines.' },
      {
        name: 'date',
        type: 'string',
        description: 'Pre-formatted display string. Format in the mapper, not here.',
      },
      {
        name: 'layout',
        type: "'vertical' | 'horizontal' | 'overlay'",
        default: "'vertical'",
        description: 'vertical for grids, horizontal for lists, overlay for features.',
      },
      {
        name: 'aspectRatio',
        type: "'cover' | 'video' | 'square' | 'portrait'",
        default: "'cover'",
        description: 'cover is 2:3 for books, square for creators, video for editorial.',
      },
      {
        name: 'stretch',
        type: 'boolean',
        default: 'false',
        description: 'Fill the grid cell for equal-height rows. The grid sets this for you.',
      },
    ],
  },
  {
    id: 'content-card-grid',
    name: 'ContentCardGrid',
    importPath: '@/components/content-card-grid',
    description:
      'Grid of ContentCards with heading and optional view-all. Wraps Section, so it takes the layout props too.',
    category: 'composed',
    props: [
      { name: 'cards', type: 'ContentCardProps[]', description: 'Required. Map via card-mappers.' },
      {
        name: 'emptyMessage',
        type: 'string',
        description:
          'Required, deliberately. Every collection needs a real empty state, and a default is how that gets skipped.',
      },
      { name: 'heading', type: 'string', description: 'Omit for an unheaded grid.' },
      {
        name: 'headingAs',
        type: "'h1' | 'h2' | 'h3'",
        default: "'h2'",
        description: 'h1 when the grid is the whole page.',
      },
      {
        name: 'columns',
        type: '1 | 2 | 3 | 4',
        default: '3',
        description: 'Columns at lg. Always 1 on mobile, 2 at sm.',
      },
      {
        name: 'dividers',
        type: 'boolean',
        default: 'false',
        description: 'Vertical rules between columns at lg and up.',
      },
      { name: 'viewAllHref', type: 'string', description: 'Shows the action link when paired with viewAllLabel.' },
      { name: 'viewAllLabel', type: 'string', description: 'Link copy. Caller-supplied, per §2.' },
    ],
  },
]
