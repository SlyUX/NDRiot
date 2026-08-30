import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, Pencil } from "lucide-react";

/**
 * A creator's comics on /me — a bare horizontal rail of covers beside the
 * creator block, no heading/background/padding of its own (it reads as part of
 * the identity band). Each cover carries a view chip (its public page) and an
 * edit chip. The rail scrolls horizontally when it overflows.
 */
export type YourComicsBook = {
  id: string;
  title: string;
  href: string | null;
  editHref: string;
  coverUrl: string | null;
};

/** A strip in the rail — its natural aspect, sized to the rail height. */
export type YourComicsStrip = {
  id: string;
  title: string;
  href: string;
  imageUrl: string;
  width: number;
  height: number;
  /** The edit affordance (a composer trigger), rendered as a corner chip. */
  editTrigger: ReactNode;
};

export function YourComics({
  books,
  strips,
  heading,
  editLabel,
}: {
  books: YourComicsBook[];
  strips: YourComicsStrip[];
  /** Accessible name for the rail (no visible heading). */
  heading: string;
  editLabel: string;
}) {
  return (
    <section aria-label={heading}>
      <ul className="punk-scroll flex gap-3 overflow-x-auto">
        {books.map((book) => (
          <li
            key={book.id}
            className="relative aspect-[2/3] w-[70px] shrink-0 overflow-hidden bg-white/10"
          >
            {book.coverUrl && (
              <Image
                src={book.coverUrl}
                alt=""
                fill
                sizes="70px"
                className="object-cover"
              />
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
        {/* Strips — natural aspect, sized to the rail height, with the same
            view + edit chips as a cover. */}
        {strips.map((strip) => (
          <li key={strip.id} className="relative h-[105px] shrink-0">
            <Image
              src={strip.imageUrl}
              alt=""
              width={strip.width}
              height={strip.height}
              sizes="160px"
              className="h-full w-auto bg-white/10 object-contain"
            />
            <Link
              href={strip.href}
              aria-label={strip.title}
              className="focus-visible:ring-ring absolute bottom-0 left-0 inline-flex bg-black/70 p-1.5 text-white transition-colors hover:text-white/70 focus-visible:ring-2 focus-visible:-outline-offset-2 focus-visible:outline-none"
            >
              <Eye aria-hidden="true" className="size-3.5" />
            </Link>
            <div className="absolute right-0 bottom-0">{strip.editTrigger}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
