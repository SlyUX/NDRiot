import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/section";

/**
 * The closing "Join the Riot" call-to-action — a full-bleed --primary (pink)
 * band before the footer. It's the page's one large field of brand color (the
 * heartbeat the long dark scroll was missing) and its closing conversion moment
 * (ND Riot is a creator-recruitment MVP, and "Join" was otherwise only a small
 * hero button). Black text on pink (§9); the Join link is structural, the copy
 * is CMS-managed (§2). Rendered logged-out only — a signed-in creator has
 * already joined.
 */
export function JoinBand({
  heading,
  cta,
}: {
  heading: string;
  cta: string;
}) {
  return (
    <Section background="primary" padding="md">
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="max-w-2xl text-2xl font-black tracking-tighter uppercase sm:text-3xl">
          {heading}
        </h2>
        <Button
          asChild
          size="lg"
          variant="inverse"
          className="shrink-0 font-black tracking-wide uppercase"
        >
          <Link href="/join">{cta}</Link>
        </Button>
      </div>
    </Section>
  );
}
