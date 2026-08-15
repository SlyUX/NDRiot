'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Eye, Pencil } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * A creator's comics on /me — a horizontal rail of covers on the ND Riot pink,
 * darkened with a black wash (the home-hero technique) so white content stays
 * legible on it (§9: white fails on raw #FF0095). Each card links to the book
 * from its title; a bare pencil under the title opens the edit form.
 *
 * On desktop it sits beside the creator block and the rail always shows. On
 * phones, where it stacks, it's a "+"/"×" accordion (the hamburger's mark) so it
 * doesn't push the rest of the dashboard down.
 */
export type YourComicsBook = {
  id: string
  title: string
  href: string | null
  editHref: string
  coverUrl: string | null
}

export function YourComics({
  books,
  heading,
  editLabel,
}: {
  books: YourComicsBook[]
  heading: string
  editLabel: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <section className="bg-primary relative overflow-hidden">
      {/* Black wash so white text/icons clear AA on the pink (like the hero). */}
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
      <div className="relative p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-black tracking-widest text-white uppercase">{heading}</h2>
          {/* Accordion trigger — phones only; the "+" rotates 45° into "×". */}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={heading}
            aria-expanded={open}
            aria-controls="your-comics-rail"
            className="focus-visible:ring-ring -mr-2 inline-flex size-11 items-center justify-center focus-visible:ring-2 focus-visible:outline-none lg:hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/nd-riot-menu-trigger.svg"
              alt=""
              aria-hidden="true"
              className={cn(
                'size-6 transition-transform duration-200 ease-out motion-reduce:transition-none',
                open && 'rotate-45',
              )}
            />
          </button>
        </div>

        {/* Collapsed on phones until opened; always shown from lg up. */}
        <ul
          id="your-comics-rail"
          className={cn(
            'punk-scroll mt-4 flex gap-3 overflow-x-auto pb-3',
            !open && 'hidden lg:flex',
          )}
        >
          {books.map((book) => (
            <li key={book.id} className="relative aspect-[2/3] w-[70px] shrink-0 overflow-hidden bg-white/10">
              {book.coverUrl && (
                <Image src={book.coverUrl} alt="" fill sizes="70px" className="object-cover" />
              )}
              {/* Actions on chips so they stay visible over any cover: view the
                  public page (lower-left), edit (lower-right). */}
              {book.href && (
                <Link
                  href={book.href}
                  aria-label={book.title}
                  className="focus-visible:ring-ring absolute bottom-0 left-0 inline-flex bg-black/70 p-1.5 text-white transition-colors hover:text-white/70 focus-visible:ring-2 focus-visible:-outline-offset-2 focus-visible:outline-none"
                >
                  <Eye aria-hidden="true" className="size-3.5" />
                </Link>
              )}
              <Link
                href={book.editHref}
                aria-label={`${editLabel} — ${book.title}`}
                className="focus-visible:ring-ring absolute right-0 bottom-0 inline-flex bg-black/70 p-1.5 text-white transition-colors hover:text-white/70 focus-visible:ring-2 focus-visible:-outline-offset-2 focus-visible:outline-none"
              >
                <Pencil aria-hidden="true" className="size-3.5" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
