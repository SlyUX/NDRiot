import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";

import { ContentCardGrid } from "@/components/content-card-grid";
import { Section, type SectionProps } from "@/components/ui/section";

type SectionLike = ReactElement<{ background?: SectionProps["background"] }>;

/**
 * A child the rhythm should color: a `Section` / `ContentCardGrid` that hasn't
 * been given an explicit `background`. Anything else — a `<JsonLd>` script, a
 * conditional that rendered nothing, a section that already owns a band (a
 * charcoal band, the creator zone, the pink newsletter band) — is left
 * untouched and doesn't advance the rhythm.
 */
function alternable(child: ReactNode): child is SectionLike {
  if (!isValidElement(child)) return false;
  if (child.type !== Section && child.type !== ContentCardGrid) return false;
  return (child as SectionLike).props.background == null;
}

/**
 * Alternates its section children's backgrounds between `--background` and
 * `--surface-alt` (§9), for the paged rhythm — the page just wraps its content
 * sections in this.
 *
 * Server-safe (no 'use client'), so pages can wrap their server-rendered
 * sections directly.
 */
export function AlternatingSections({
  children,
  startAlt = false,
}: {
  children: ReactNode;
  /** Begin on the raised band (`--surface-alt`) instead of the base. */
  startAlt?: boolean;
}) {
  // toArray drops the falsy children of `{cond && <Section/>}` and flattens any
  // mapped arrays, so the colorable-sibling count below is exact.
  const nodes = Children.toArray(children);
  const start = startAlt ? 1 : 0;

  return (
    <>
      {nodes.map((child, index) => {
        if (!alternable(child)) return child;
        // Rank = colorable siblings before this one. Counting rather than a
        // mutable running index keeps this free of post-render reassignment.
        const rank = nodes.slice(0, index).filter(alternable).length;
        const background: SectionProps["background"] =
          (start + rank) % 2 === 0 ? "background" : "alt";
        return cloneElement(child, { background });
      })}
    </>
  );
}
