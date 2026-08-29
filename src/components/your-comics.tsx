import Image from "next/image";
import Link from "next/link";
import { Eye, Pencil, Plus } from "lucide-react";

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

export function YourComics({
  books,
  heading,
  editLabel,
  addHref,
  addLabel,
}: {
  books: YourComicsBook[];
  /** Accessible name for the rail (no visible heading). */
  heading: string;
  editLabel: string;
  /** The "add a comic" tile at the end of the rail → the intake form. */
  addHref: string;
  addLabel: string;
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
        {/* Add-a-comic tile — same footprint as a cover, closing the rail. */}
        <li className="shrink-0">
          <Link
            href={addHref}
            aria-label={addLabel}
            className="focus-visible:ring-ring flex aspect-[2/3] w-[70px] items-center justify-center bg-black text-white transition-colors hover:bg-black/80 focus-visible:ring-2 focus-visible:-outline-offset-2 focus-visible:outline-none"
          >
            <Plus aria-hidden="true" className="size-8" strokeWidth={3} />
          </Link>
        </li>
      </ul>
    </section>
  );
}
