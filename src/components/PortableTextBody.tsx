import Image from 'next/image'
import { PortableText, type PortableTextComponents } from '@portabletext/react'
import type { TypedObject } from '@portabletext/types'

import { urlFor } from '@/sanity/image'
import type { SanityImage } from '@/lib/types'

/**
 * Renders Portable Text from `book.description`, `column.body`,
 * `interview.body`.
 *
 * Every block is styled explicitly rather than through Tailwind Typography's
 * `prose` — that plugin is not installed here, so the `prose` classes this used
 * to carry were dead, which is why paragraphs ran together with no separation.
 * The wrapper's `space-y-*` is what gives consecutive paragraphs a standard gap
 * regardless of how the block was authored (a trailing <br>, an empty block).
 *
 * The `imageWithAlt` block also needs a renderer: without one, Portable Text
 * emits a "no component registered" warning and drops the image silently.
 */
const components: PortableTextComponents = {
  block: {
    normal: ({ children }) => <p className="leading-relaxed">{children}</p>,
    h2: ({ children }) => (
      <h2 className="pt-2 text-2xl font-black tracking-tight uppercase">{children}</h2>
    ),
    h3: ({ children }) => <h3 className="pt-2 text-xl font-bold">{children}</h3>,
    h4: ({ children }) => <h4 className="text-lg font-bold">{children}</h4>,
    blockquote: ({ children }) => (
      <blockquote className="border-primary text-muted-foreground border-l-2 pl-4 italic">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
    number: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
  },
  marks: {
    link: ({ value, children }: { value?: { href?: string }; children: React.ReactNode }) => {
      const href = value?.href ?? '#'
      const external = /^https?:\/\//i.test(href)
      return (
        <a
          href={href}
          className="text-primary underline underline-offset-2 hover:no-underline"
          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {children}
        </a>
      )
    },
  },
  types: {
    imageWithAlt: ({ value }: { value: SanityImage }) => {
      if (!value?.asset) return null

      return (
        <figure className="my-2">
          <Image
            src={urlFor(value).width(1200).url()}
            alt={value.alt ?? ''}
            width={1200}
            height={0}
            sizes="(max-width: 768px) 100vw, 768px"
            className="h-auto w-full"
          />
          {value.alt && (
            <figcaption className="text-muted-foreground mt-2 text-xs">{value.alt}</figcaption>
          )}
        </figure>
      )
    },
  },
}

// TypedObject[] rather than a specific query's block type: this renders any
// Portable Text — column/interview bodies, book descriptions, hub intros — and
// each of those is a distinct generated type. PortableText itself is generic,
// so nothing is lost by accepting the loose block shape here.
export default function PortableTextBody({ value }: { value?: TypedObject[] | null }) {
  if (!value?.length) return null

  return (
    <div className="max-w-none space-y-4 leading-relaxed">
      <PortableText value={value} components={components} />
    </div>
  )
}
