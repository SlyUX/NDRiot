import { Fragment } from "react";
import Link from "next/link";

import { mentionHref } from "@/lib/mentions";

/**
 * Renders an update body with its @-mentions linked inline. The composer inserts
 * each pick as literal "@Display Name" text; here we find those spans (by the
 * stored mention names) and turn them into links to the creator / convention /
 * outlet page. Everything else renders as plain text.
 *
 * Names are matched longest-first so "@Ann Lee" wins over "@Ann". Two mentions
 * that share a display name are ambiguous and both resolve to one of them —
 * rare, and the fallback (a link to a real page) is harmless.
 */
type Mention = {
  _id: string;
  _type: string;
  name: string;
  slug: string;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function MentionedText({
  body,
  mentions,
  linkClassName,
}: {
  body: string;
  mentions?: readonly Mention[] | null;
  linkClassName?: string;
}) {
  if (!mentions?.length) return <>{body}</>;

  // First name wins if two mentions share a display name.
  const byName = new Map<string, Mention>();
  for (const mention of mentions) {
    if (mention.name && !byName.has(mention.name)) byName.set(mention.name, mention);
  }
  const names = [...byName.keys()]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp);
  if (names.length === 0) return <>{body}</>;

  const pattern = new RegExp(`@(${names.join("|")})`, "g");
  const nodes: React.ReactNode[] = [];
  const matched = new Set<string>();
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(body)) !== null) {
    if (match.index > last) nodes.push(body.slice(last, match.index));
    const mention = byName.get(match[1])!;
    matched.add(mention.name);
    nodes.push(
      <Link key={key++} href={mentionHref(mention)} className={linkClassName}>
        @{mention.name}
      </Link>,
    );
    last = pattern.lastIndex;
  }
  if (last < body.length) nodes.push(body.slice(last));

  // Any tagged mention whose "@Name" isn't in the body (a legacy update, or one
  // whose inline text was edited out) still gets a trailing link, so a stored
  // reference is never silently dropped from the reader's view.
  const leftover = [...byName.values()].filter((m) => !matched.has(m.name));

  return (
    <>
      {nodes.map((node, i) => (
        <Fragment key={i}>{node}</Fragment>
      ))}
      {leftover.map((mention, i) => (
        <Fragment key={`leftover-${i}`}>
          {i === 0 ? " " : " "}
          <Link href={mentionHref(mention)} className={linkClassName}>
            @{mention.name}
          </Link>
        </Fragment>
      ))}
    </>
  );
}
