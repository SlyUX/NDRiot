import Image from 'next/image'
import { PortableText, type PortableTextComponents } from '@portabletext/react'

import { urlFor } from '@/sanity/image'
import type { RichText, SanityImage } from '@/lib/types'

/**
 * Renders Portable Text from `column.body` / `interview.body`.
 *
 * Those arrays accept `imageWithAlt` alongside text blocks, so an inline image
 * renderer is required — without one, Portable Text emits a "no component
 * registered" warning and drops the image silently.
 */
const components: PortableTextComponents = {
  types: {
    imageWithAlt: ({ value }: { value: SanityImage }) => {
      if (!value?.asset) return null

      return (
        <figure className="my-6">
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

export default function PortableTextBody({ value }: { value?: RichText }) {
  if (!value?.length) return null

  return (
    <div className="prose prose-invert max-w-none">
      <PortableText value={value} components={components} />
    </div>
  )
}
