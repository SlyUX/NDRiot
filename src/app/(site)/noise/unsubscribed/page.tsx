import type { Metadata } from "next";

import { SectionHeading } from "@/components/section-heading";
import { Section } from "@/components/ui/section";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

/**
 * The ND Noise unsubscribe confirmation. The actual removal happens in the
 * `/api/noise/unsubscribe` route (which redirects here); this page just tells
 * the reader it worked. Copy is CMS-managed (§2). Noindex — it's a per-person
 * dead end, not a discoverable page.
 */
export const metadata: Metadata = {
  title: "Unsubscribed",
  robots: { index: false, follow: false },
};

export default async function NoiseUnsubscribedPage() {
  const { noise } = await getSiteSettings();
  return (
    <Section as="article" padding="md" maxWidth="3xl" innerClassName="space-y-4">
      <SectionHeading>{noise.unsubscribedHeading}</SectionHeading>
      <p className="text-muted-foreground">{noise.unsubscribedBody}</p>
    </Section>
  );
}
