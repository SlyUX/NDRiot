import { CalendarDays, Wrench, Newspaper, Handshake } from "lucide-react";

import { FeatureLinkCard } from "@/components/feature-link-card";
import { SectionHeading } from "@/components/section-heading";
import { Section, type SectionProps } from "@/components/ui/section";
import type { FunnelCard } from "@/lib/site-settings";

/**
 * The "For Creators" row beneath Creators — a funnel, not a listing. One card
 * per creator-facing area (Conventions · Resources · Media · Allies): an icon, a
 * title, and a short "what's inside" blurb linking to the section. Icons + links
 * are fixed in code (structural); the copy is CMS-managed (§2). Each card
 * collapses to a tappable row on mobile (FeatureLinkCard); desktop shows them
 * in full.
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
  const iconClass = "text-primary size-6 shrink-0 md:size-7";
  const areas = [
    {
      href: "/conventions",
      icon: <CalendarDays aria-hidden="true" strokeWidth={1.75} className={iconClass} />,
      card: cards.conventions,
    },
    {
      href: "/resources",
      icon: <Wrench aria-hidden="true" strokeWidth={1.75} className={iconClass} />,
      card: cards.resources,
    },
    {
      href: "/media",
      icon: <Newspaper aria-hidden="true" strokeWidth={1.75} className={iconClass} />,
      card: cards.media,
    },
    {
      href: "/allies",
      icon: <Handshake aria-hidden="true" strokeWidth={1.75} className={iconClass} />,
      card: cards.allies,
    },
  ];

  return (
    <Section padding="md" background={background}>
      <SectionHeading size="md">{heading}</SectionHeading>
      <ul className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
        {areas.map(({ href, icon, card }) => (
          <FeatureLinkCard
            key={href}
            href={href}
            icon={icon}
            title={card.title}
            description={card.description}
          />
        ))}
      </ul>
    </Section>
  );
}
