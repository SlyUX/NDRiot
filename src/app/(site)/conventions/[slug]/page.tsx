import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConventionTablers } from "@/components/convention-tablers";
import { ConventionRatings } from "@/components/convention-ratings";
import {
  RatingForm,
  type RatingEligibleCreator,
} from "@/components/rating-form";
import { Section } from "@/components/ui/section";
import { auth } from "@/auth";
import { pageMetadata } from "@/lib/page-metadata";
import {
  safeFetch,
  freshFetch,
  CONVENTION_QUERY,
  CONVENTION_TABLERS_QUERY,
  CONVENTION_RATINGS_QUERY,
  CON_RATING_CONTEXT_QUERY,
} from "@/lib/queries";
import { getSiteSettings } from "@/lib/site-settings";
import { externalHref } from "@/lib/utils";
import { formatPlace } from "@/lib/place";
import { aggregateRatings } from "@/lib/ratings";
import { creatorsOwnedBy } from "@/sanity/ownership-client";
import type {
  ConventionDetail,
  ConventionTabler,
  ConventionRatingRow,
  ConRatingContext,
} from "@/lib/types";
import { urlFor } from "@/sanity/image";

/**
 * A single convention page — what it is, where and roughly when it happens, and
 * a link out to the official site. Creator ratings will land here in a later
 * phase; for now it's the venue's home in the directory.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [convention, settings] = await Promise.all([
    safeFetch<ConventionDetail | null>(CONVENTION_QUERY, { slug }, null),
    getSiteSettings(),
  ]);
  if (!convention) return {};
  return pageMetadata({
    title: convention.name,
    description: convention.description ?? undefined,
    path: `/conventions/${slug}`,
    siteTitle: settings.siteTitle,
  });
}

export default async function ConventionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [convention, settings, session] = await Promise.all([
    safeFetch<ConventionDetail | null>(CONVENTION_QUERY, { slug }, null),
    getSiteSettings(),
    auth(),
  ]);

  if (!convention) notFound();

  // Creators tabling at the upcoming occurrence (neutral order, §3) + all
  // creator ratings, aggregated for display.
  const [tablers, rawRatings] = await Promise.all([
    freshFetch<ConventionTabler[]>(
      CONVENTION_TABLERS_QUERY,
      { conId: convention._id },
      [],
    ),
    freshFetch<ConventionRatingRow[]>(
      CONVENTION_RATINGS_QUERY,
      { conId: convention._id },
      [],
    ),
  ]);
  const ratings = aggregateRatings(rawRatings);

  // The rate form is shown only to a signed-in creator who's marked an
  // appearance here (the action re-checks). Prefilled from their existing rating.
  const email = session?.user?.email;
  let raters: RatingEligibleCreator[] = [];
  if (email) {
    const ownedIds = await creatorsOwnedBy(email);
    if (ownedIds.length) {
      const context = await freshFetch<ConRatingContext[]>(
        CON_RATING_CONTEXT_QUERY,
        { conId: convention._id, creatorIds: ownedIds },
        [],
      );
      raters = context
        .filter((c) => c.hasAppearance)
        .map((c) => ({
          id: c._id,
          name: c.name ?? "Your profile",
          rating: c.rating,
        }));
    }
  }

  // Location and timing, joined for the meta line under the title.
  const meta = [formatPlace(convention.place), convention.whenHint]
    .filter(Boolean)
    .join(" · ");

  return (
    <Section
      as="article"
      padding="md"
      maxWidth="3xl"
      innerClassName="space-y-6"
    >
      {convention.image && (
        <div className="bg-muted relative aspect-video overflow-hidden">
          <Image
            src={urlFor(convention.image).width(1200).url()}
            alt={convention.image.alt ?? ""}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-contain"
            priority
          />
        </div>
      )}

      <header className="space-y-2">
        <h1 className="text-3xl font-black tracking-tighter uppercase">
          {convention.name}
        </h1>
        {meta && (
          <p className="text-primary text-xs font-bold tracking-widest uppercase">
            {meta}
          </p>
        )}
        {convention.description && (
          <p className="text-foreground/85 max-w-prose text-base">
            {convention.description}
          </p>
        )}
      </header>

      {convention.website && (
        <Button
          asChild
          size="lg"
          className="font-black tracking-wide uppercase"
        >
          <a
            href={externalHref(convention.website)}
            target="_blank"
            rel="nofollow noopener noreferrer"
          >
            {settings.sections.conventionVisitLabel}
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </a>
        </Button>
      )}

      <ConventionTablers
        tablers={tablers}
        heading={settings.sections.conventionTablersHeading}
        tableLabel={settings.sections.tableLabel}
      />

      <ConventionRatings
        aggregate={ratings}
        signedIn={Boolean(email)}
        signInCopy={{
          title: settings.sections.accountSignInTitle,
          body: settings.sections.accountSignInBody,
          cta: settings.sections.accountSignInCta,
        }}
        labels={{
          heading: settings.sections.conventionRatingsHeading,
          scaleNote: settings.sections.conventionRatingsScaleNote,
          celebrityLabel: settings.sections.conventionRateCelebrityLabel,
          tableCostLabel: settings.sections.conventionRateTableCostLabel,
          countLabel: settings.sections.conventionRatingsCountLabel,
          empty: settings.sections.conventionRatingsEmpty,
        }}
      />

      {raters.length > 0 && (
        <RatingForm
          conventionId={convention._id}
          creators={raters}
          labels={{
            heading: settings.sections.conventionRateHeading,
            saveLabel: settings.sections.conventionRateSaveLabel,
            updateLabel: settings.sections.conventionRateUpdateLabel,
            removeLabel: settings.sections.accountRemoveLabel,
            noteLabel: settings.sections.conventionRateNoteLabel,
            notePlaceholder: settings.sections.conventionRateNotePlaceholder,
            celebrityLabel: settings.sections.conventionRateCelebrityLabel,
            tableCostLabel: settings.sections.conventionRateTableCostLabel,
            noOpinion: settings.sections.conventionRateNoOpinion,
          }}
        />
      )}
    </Section>
  );
}
