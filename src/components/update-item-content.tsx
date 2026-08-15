import type { ReactNode } from "react";
import Link from "next/link";

import { formatDate } from "@/lib/card-mappers";
import type { UpdateFeedItem } from "@/lib/types";

/** Where an update's target links to (its comic or creator page). */
export function updateTargetHref(update: UpdateFeedItem): string | null {
  if (!update.targetSlug) return null;
  return update.targetType === "book"
    ? `/books/${update.targetSlug}`
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
      <p className="mt-2 text-sm">{update.body}</p>
      {update.mentions && update.mentions.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {update.mentions.map((mention) => (
            <li key={mention._id}>
              <Link
                href={
                  mention._type === "convention"
                    ? `/conventions/${mention.slug}`
                    : `/creators/${mention.slug}`
                }
                className="border-border hover:border-primary hover:text-primary inline-block border px-2 py-0.5 text-xs transition-colors"
              >
                {mention.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
