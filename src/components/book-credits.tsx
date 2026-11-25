import Link from "next/link";

import { CreditClaimLink } from "@/components/credit-claim-link";
import type { BookCredit } from "@/lib/types";

/**
 * The collaborator credits on a comic's page — one row per credit, role(s) on
 * the left, person on the right. A credit linking an ND Riot creator links to
 * their profile; a plain-name credit (someone not on ND Riot) is text, and — for
 * the comic's owner — carries a "claim link" control so they can invite that
 * person to join and claim the credit. Presentational: the owner/primary creator
 * is shown separately as a card, not in this list.
 */
export function BookCredits({
  credits,
  isOwner = false,
  bookId,
  claimLinkLabel,
  claimCopiedLabel,
}: {
  credits: BookCredit[];
  isOwner?: boolean;
  bookId?: string;
  claimLinkLabel?: string;
  claimCopiedLabel?: string;
}) {
  const rows = credits.filter((credit) => credit.creator?.name || credit.name);
  if (rows.length === 0) return null;

  return (
    <ul className="border-border divide-border divide-y border-t text-sm">
      {rows.map((credit, index) => {
        const name = credit.creator?.name ?? credit.name;
        const slug = credit.creator?.slug;
        const isPlainName = !credit.creator && Boolean(credit.name);
        return (
          <li
            key={`${name}-${index}`}
            className="flex items-baseline justify-between gap-4 py-2"
          >
            <span className="text-muted-foreground text-xs font-bold tracking-wide uppercase">
              {credit.roles?.join(", ")}
              {credit.note && (
                <span className="font-normal normal-case"> · {credit.note}</span>
              )}
            </span>
            <span className="flex flex-col items-end gap-1 text-right">
              {slug ? (
                <Link
                  href={`/creators/${slug}`}
                  className="text-primary hover:underline"
                >
                  {name}
                </Link>
              ) : (
                <span className="text-foreground">{name}</span>
              )}
              {isOwner && isPlainName && bookId && credit._key && (
                <CreditClaimLink
                  bookId={bookId}
                  creditKey={credit._key}
                  label={claimLinkLabel ?? "Invite to claim"}
                  copiedLabel={claimCopiedLabel ?? "Link copied"}
                />
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
