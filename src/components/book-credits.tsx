import Link from "next/link";

import type { BookCredit } from "@/lib/types";

/**
 * The collaborator credits on a comic's page — one row per credit, role on the
 * left, person on the right. A credit linking an ND Riot creator links to their
 * profile; a plain-name credit (someone not on ND Riot) is text. Presentational:
 * the owner/primary creator is shown separately as a card, not in this list.
 */
export function BookCredits({ credits }: { credits: BookCredit[] }) {
  const rows = credits.filter((credit) => credit.creator?.name || credit.name);
  if (rows.length === 0) return null;

  return (
    <ul className="border-border divide-border divide-y border-t text-sm">
      {rows.map((credit, index) => {
        const name = credit.creator?.name ?? credit.name;
        const slug = credit.creator?.slug;
        return (
          <li
            key={`${credit.role}-${name}-${index}`}
            className="flex items-baseline justify-between gap-4 py-2"
          >
            <span className="text-muted-foreground text-xs font-bold tracking-wide uppercase">
              {credit.role}
            </span>
            {slug ? (
              <Link
                href={`/creators/${slug}`}
                className="text-primary text-right hover:underline"
              >
                {name}
              </Link>
            ) : (
              <span className="text-foreground text-right">{name}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
