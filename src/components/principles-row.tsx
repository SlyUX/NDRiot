import { Shuffle, Scale, Equal, MegaphoneOff } from "lucide-react";

import { SectionHeading } from "@/components/section-heading";
import { Section, type SectionProps } from "@/components/ui/section";
import type { FunnelCard } from "@/lib/site-settings";

/**
 * The "how ND Riot works" refusals — four promises stated plainly: no algorithm,
 * no favoritism, no influencers, no ads. The site *behaves* these everywhere
 * (§3: random hero, no ranking, visible filters); this is where it says them out
 * loud. A statement row, not a funnel — the cards don't link. Icons are
 * structural (fixed in code); all copy is CMS-managed (§2).
 *
 * `heading` is optional: logged-out, the row runs headingless on --surface-alt,
 * directly beneath the hero's "Real Indie Comics." identity line (it reads as
 * that line's support); logged-in it sits on a --primary (pink) band under its
 * own "How ND Riot Works" heading. Either way the cards keep an explicit gray
 * (--surface-alt) fill, so they read the same on both bands. Mirrors the
 * ForCreatorsRow card (icon · title · blurb) but composes Section +
 * SectionHeading rather than extending that nav component, since these are
 * non-interactive value statements, not links.
 */
export function PrinciplesRow({
  heading,
  principles,
  background,
}: {
  heading?: string;
  principles: {
    algorithm: FunnelCard;
    favoritism: FunnelCard;
    influencers: FunnelCard;
    ads: FunnelCard;
  };
  background?: SectionProps["background"];
}) {
  // On a --primary band the section cascades black text, so the heading takes
  // the on-primary (black) tone and the cards pin their own colors: gray fill,
  // --foreground (white) title, --muted-foreground body, --primary icon — all AA
  // on --surface-alt (§9), and unchanged from the logged-out gray band.
  const onPrimary = background === "primary";
  const items = [
    { key: "algorithm", Icon: Shuffle, card: principles.algorithm },
    { key: "favoritism", Icon: Scale, card: principles.favoritism },
    { key: "influencers", Icon: Equal, card: principles.influencers },
    { key: "ads", Icon: MegaphoneOff, card: principles.ads },
  ];

  return (
    <Section padding="md" background={background}>
      {heading ? (
        <SectionHeading size="md" tone={onPrimary ? "onPrimary" : "default"}>
          {heading}
        </SectionHeading>
      ) : null}
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ key, Icon, card }) => (
          <li
            key={key}
            className="border-border bg-surface-alt flex h-full flex-col border p-6"
          >
            <Icon
              aria-hidden="true"
              className="text-primary size-7"
              strokeWidth={1.75}
            />
            <h3 className="text-foreground mt-4 text-lg font-black tracking-tight uppercase">
              {card.title}
            </h3>
            <p className="text-muted-foreground mt-2 text-sm">
              {card.description}
            </p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
