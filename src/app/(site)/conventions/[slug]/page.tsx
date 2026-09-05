import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InitialsAvatar } from "@/components/initials-avatar";
import { CONVENTION_KIND_LABEL } from "@/lib/card-mappers";
import { EventDialog } from "@/components/event-dialog";
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
import { formatOccurrence } from "@/lib/conventions";
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

  // The rate form is shown to any signed-in creator (the action re-checks
  // ownership). Prefilled from their existing rating. The same creators can mark
  // "I'm Attending" for this con.
  const email = session?.user?.email;
  let raters: RatingEligibleCreator[] = [];
  const attendingByCreator: Record<
    string,
    { status: string; tableNumber: string | null; note: string | null }
  > = {};
  if (email) {
    const ownedIds = await creatorsOwnedBy(email);
    if (ownedIds.length) {
      const context = await freshFetch<ConRatingContext[]>(
        CON_RATING_CONTEXT_QUERY,
        { conId: convention._id, creatorIds: ownedIds },
        [],
      );
      raters = context.map((c) => ({
        id: c._id,
        name: c.name ?? "Your profile",
        rating: c.rating,
      }));
      // Which owned profiles already have an appearance here — prefills the
      // "I'm Attending" modal and offers Cancel (which delists them).
      for (const c of context) {
        if (c.appearance) {
          attendingByCreator[c._id] = {
            status: c.appearance.status,
            tableNumber: c.appearance.tableNumber,
            note: c.appearance.note,
          };
        }
      }
    }
  }
  const eventCreators = raters.map((r) => ({ id: r.id, name: r.name }));
  // If every owned profile is already attending, the button manages rather than adds.
  const allAttending =
    eventCreators.length > 0 &&
    eventCreators.every((c) => attendingByCreator[c.id]);

  // Location and timing, joined for the meta line under the title. Prefer the
  // real occurrence dates; fall back to the legacy free-text hint.
  const when =
    formatOccurrence(convention.startDate, convention.endDate) ??
    convention.whenHint;
  const meta = [formatPlace(convention.place), when]
    .filter(Boolean)
    .join(" · ");

  return (
    <Section
      as="article"
      padding="md"
      maxWidth="3xl"
      innerClassName="space-y-6"
    >
      {/* Square + object-contain, matching the cards (no odd cropping), just
          shown larger. No logo (the source found one for only ~⅗ of shows) →
          the same stylized initials tag a creator gets without an avatar. */}
      <div className="relative aspect-square w-full max-w-md overflow-hidden bg-white">
        {convention.image ? (
          <Image
            src={urlFor(convention.image).width(900).url()}
            alt={convention.image.alt ?? ""}
            fill
            sizes="(max-width: 768px) 100vw, 448px"
            className="object-contain"
            priority
          />
        ) : (
          <InitialsAvatar name={convention.name} tone="brand" className="text-8xl" />
        )}
      </div>

      <header className="space-y-2">
        {convention.kind && CONVENTION_KIND_LABEL[convention.kind] && (
          <Badge
            variant="outline"
            className="border-primary/60 text-primary px-2.5 py-0.5 text-[10px] tracking-widest uppercase"
          >
            {CONVENTION_KIND_LABEL[convention.kind]}
          </Badge>
        )}
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

      {(convention.website || eventCreators.length > 0) && (
        <div className="flex flex-wrap gap-3">
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
          {/* Any signed-in creator can mark attendance — the con is locked in. */}
          {eventCreators.length > 0 && (
            <EventDialog
              creators={eventCreators}
              lockedConvention={{ id: convention._id, name: convention.name }}
              existingByCreator={attendingByCreator}
              labels={{
                addHeading: allAttending
                  ? settings.sections.conventionManageAttendingLabel
                  : settings.sections.conventionAttendingLabel,
                conventionLabel: settings.sections.accountEventConventionLabel,
                tableFieldLabel: settings.sections.accountEventTableLabel,
                noteFieldLabel: settings.sections.accountEventNoteLabel,
                saveLabel: settings.sections.accountEventSaveLabel,
                removeLabel: settings.sections.conventionCancelAttendingLabel,
                postingLabel: settings.sections.accountPostingLabel,
                postedLabel: settings.sections.accountEventPosted,
              }}
              trigger={
                <Button
                  size="lg"
                  variant="inverse"
                  className="font-black tracking-wide uppercase"
                >
                  {allAttending
                    ? settings.sections.conventionManageAttendingLabel
                    : settings.sections.conventionAttendingLabel}
                </Button>
              }
            />
          )}
        </div>
      )}

      {(() => {
        // Facts a creator weighs — shown only where we have them.
        const facts = [
          { label: settings.sections.conventionSizeLabel, value: convention.size },
          { label: settings.sections.conventionRunByLabel, value: convention.organizer },
        ].filter((f) => f.value);
        if (facts.length === 0) return null;
        return (
          <dl className="border-border grid gap-3 border-t pt-6">
            {facts.map((fact) => (
              <div key={fact.label} className="flex flex-col gap-1 sm:flex-row sm:gap-4">
                <dt className="text-muted-foreground w-28 shrink-0 text-[10px] tracking-widest uppercase sm:pt-0.5">
                  {fact.label}
                </dt>
                <dd className="text-foreground/85 text-sm">{fact.value}</dd>
              </div>
            ))}
          </dl>
        );
      })()}

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
            skipNote: settings.sections.conventionRateSkipNote,
            noOpinion: settings.sections.conventionRateNoOpinion,
          }}
        />
      )}
    </Section>
  );
}
