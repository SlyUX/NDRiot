import type { ReactNode } from "react";
import Link from "next/link";

import { MentionedText } from "@/components/mentioned-text";
import { formatDate } from "@/lib/card-mappers";
import type { UpdateFeedItem } from "@/lib/types";

/** Where an update's target links to (its comic or creator page). */
export function updateTargetHref(update: UpdateFeedItem): string | null {
  if (!update.targetSlug) return null;
  return update.targetType === "book"
    ? `/comics/${update.targetSlug}`
    : `/creators/${update.targetSlug}`;
}

/**
 * One update's content — the kind tag, the target link, the date, the body, and
 * any mention chips. Presentational and shared: the read-only feed renders it
 * directly; the owner's row wraps it with a delete control passed as `action`.
 */
export function UpdateItemContent({
  update,
  action,
}: {
  update: UpdateFeedItem;
  action?: ReactNode;
}) {
  const href = updateTargetHref(update);
  const date = formatDate(update.publishedAt);
  const name = update.targetName ?? "Untitled";

  return (
    <>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs">
        {/* Pink on a --card chip, not bare pink: the label can land on the
            --surface-alt band (§9), where bare pink is 3.99:1 and fails AA. On
            the #0a0a0a chip it's 5.36:1 on every band. Square, house style. */}
        <span className="bg-card text-primary px-1.5 py-0.5 font-black tracking-widest uppercase">
          {update.kind}
        </span>
        {href ? (
          <Link
            href={href}
            className="hover:text-primary font-bold transition-colors"
          >
            {name}
          </Link>
        ) : (
          <span className="font-bold">{name}</span>
        )}
        <span className="text-muted-foreground ml-auto flex items-center gap-3">
          {date && <time dateTime={update.publishedAt}>{date}</time>}
          {action}
        </span>
      </div>
      {/* @-mentions are linked inline within the body (MentionedText). */}
      <p className="mt-2 text-sm">
        <MentionedText
          body={update.body}
          mentions={update.mentions}
          linkClassName="text-primary font-bold hover:underline"
        />
      </p>
    </>
  );
}
