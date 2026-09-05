import Link from "next/link";
import { CalendarDays, Wrench, Newspaper, Handshake } from "lucide-react";

import { SectionHeading } from "@/components/section-heading";
import { Section, type SectionProps } from "@/components/ui/section";
import type { FunnelCard } from "@/lib/site-settings";

/**
 * The "For Creators" row beneath Creators — a funnel, not a listing. One card
 * per creator-facing area (Conventions · Resources · Media · Allies): an icon, a
 * title, and a short "what's inside" blurb linking to the section. Icons + links
 * are fixed in code (structural); the copy is CMS-managed (§2). Replaces the old
 * home Conventions + Resources listing rows, which also drops their fetches.
 */
export function ForCreatorsRow({
  heading,
  cards,
  background,
}: {
  heading: string;
  cards: {
    conventions: FunnelCard;
    resources: FunnelCard;
    media: FunnelCard;
    allies: FunnelCard;
  };
  background?: SectionProps["background"];
}) {
  const areas = [
    { href: "/conventions", Icon: CalendarDays, card: cards.conventions },
    { href: "/resources", Icon: Wrench, card: cards.resources },
    { href: "/media", Icon: Newspaper, card: cards.media },
    { href: "/allies", Icon: Handshake, card: cards.allies },
  ];

  return (
    <Section padding="md" background={background}>
      <SectionHeading size="md">{heading}</SectionHeading>
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {areas.map(({ href, Icon, card }) => (
          <li key={href}>
            <Link
              href={href}
              className="group border-border hover:border-primary focus-visible:ring-ring flex h-full flex-col border p-6 transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <Icon
                aria-hidden="true"
                className="text-primary size-7"
                strokeWidth={1.75}
              />
              <h3 className="group-hover:text-primary mt-4 text-lg font-black tracking-tight uppercase transition-colors">
                {card.title}
              </h3>
              <p className="text-muted-foreground mt-2 text-sm">
                {card.description}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
