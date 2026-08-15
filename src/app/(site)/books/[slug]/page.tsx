import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { AlternatingSections } from "@/components/alternating-sections";
import BookLinks from "@/components/book-links";
import {
  ContentCard,
  FundingBadge,
  FUNDING_BAR_OFFSET,
} from "@/components/content-card";
import { ContentCardGrid } from "@/components/content-card-grid";
import { JsonLd } from "@/components/json-ld";
import PortableTextBody from "@/components/PortableTextBody";
import { GenreBadge } from "@/components/genre-badge";
import { SaveButton } from "@/components/save-button";
import { SectionHeading } from "@/components/section-heading";
import { ShareBar } from "@/components/share-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { auth } from "@/auth";
import { isSaved } from "@/sanity/reader-client";
import { bookToCard } from "@/lib/card-mappers";
import { pageMetadata } from "@/lib/page-metadata";
import { safeFetch, BOOK_QUERY } from "@/lib/queries";
import { getSiteSettings } from "@/lib/site-settings";
import { absoluteUrl } from "@/lib/site-url";
import {
  breadcrumbSchema,
  comicSchema,
  jsonLdGraph,
} from "@/lib/structured-data";
import { RESTRICTED_RATING } from "@/lib/taxonomy";
import type { BookDetail } from "@/lib/types";
import { truncate } from "@/lib/utils";
import { urlFor } from "@/sanity/image";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [book, settings] = await Promise.all([
    safeFetch<BookDetail | null>(BOOK_QUERY, { slug }, null),
    getSiteSettings(),
  ]);
  if (!book) return {};
  return pageMetadata({
    title: book.title,
    description: book.descriptionText,
    path: `/books/${slug}`,
    siteTitle: settings.siteTitle,
  });
}

export default async function BookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [book, settings, session] = await Promise.all([
    safeFetch<BookDetail | null>(BOOK_QUERY, { slug }, null),
    getSiteSettings(),
    auth(),
  ]);

  if (!book) notFound();

  const email = session?.user?.email;
  const saved = email ? await isSaved(email, book._id) : false;

  const creator = book.creator;
  // The creator, shown as a card after the description rather than as a byline
  // under the title — a proper introduction to the person behind the work.
  const creatorCard =
    creator?.slug != null
      ? {
          title: creator.name ?? "Comic Creator",
          href: `/creators/${creator.slug}`,
          image: creator.photo,
          imageAlt: `Portrait of ${creator.name ?? "comic creator"}`,
          eyebrow: creator.studio?.name ?? creator.location,
          summary: truncate(creator.bioText, 160),
          aspectRatio: "square" as const,
        }
      : null;

  const otherBooksHeading = settings.sections.otherBooksHeading.replace(
    "{name}",
    creator?.name ?? "this comic creator",
  );

  const buyHeading = settings.sections.buyHeading.replace(
    "{title}",
    book.title,
  );

  return (
    <div>
      <JsonLd
        data={jsonLdGraph(
          comicSchema({
            title: book.title,
            url: absoluteUrl(`/books/${slug}`),
            cover: book.cover,
            authorName: creator?.name,
            genres: book.genres,
            description: book.descriptionText,
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Comics", path: "/books" },
            { name: book.title, path: `/books/${slug}` },
          ]),
        )}
      />
      <AlternatingSections>
        <Section
          padding="md"
          innerClassName="grid gap-8 sm:grid-cols-[300px_1fr]"
        >
          {/* Cover column: the art, then the primary actions beneath it — preview
            first, then where to get it. Capped to the cover's width on mobile so
            the buttons line up under the art rather than spanning the page; the
            sm grid column (300px) takes over from there. */}
          <div className="max-w-[250px] space-y-5 sm:max-w-none">
            <div className="bg-muted relative aspect-[2/3] overflow-hidden">
              {/* Art drops below the funding bar when one is showing, so the banner
                never covers the cover (offset matches the bar's height). */}
              <div
                className={`absolute ${book.fundingUrl ? FUNDING_BAR_OFFSET : "inset-0"}`}
              >
                {book.cover && (
                  <Image
                    src={urlFor(book.cover).width(600).url()}
                    // Decorative by default — the title sits immediately beside it.
                    alt={book.cover.alt ?? ""}
                    fill
                    sizes="(max-width: 640px) 100vw, 300px"
                    className="object-cover"
                    priority
                  />
                )}
              </div>
              {book.fundingUrl && <FundingBadge url={book.fundingUrl} />}
            </div>

            {/* Preview is the primary call to action — pink, full width under the
              cover. Default variant is bg-primary / primary-foreground (§9). */}
            {book.previewUrl && (
              <Button
                asChild
                className="w-full font-black tracking-wide uppercase"
              >
                <a
                  href={book.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {settings.sections.previewCta}
                  <ExternalLink aria-hidden="true" />
                </a>
              </Button>
            )}

            {/* Buy/read links, beneath the preview — set apart in their own
              charcoal panel under the "Get it here" label. */}
            <BookLinks links={book.links} heading={buyHeading} framed />
          </div>

          <div className="space-y-5">
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase">
                {book.title}
              </h1>
              {(book.status || book.format || book.maturity) && (
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                  {(book.status || book.format || book.issueCount) && (
                    <p className="text-muted-foreground text-xs tracking-widest uppercase">
                      {[
                        book.status,
                        book.format,
                        book.issueCount
                          ? `${book.issueCount} issue${book.issueCount === 1 ? "" : "s"}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                  {book.maturity && (
                    // Mature gets the solid pink treatment; the gentler ratings
                    // sit back as outlines. A reader deciding whether to click
                    // should not have to hunt for the one that matters.
                    <Badge
                      variant={
                        book.maturity === RESTRICTED_RATING
                          ? "default"
                          : "outline"
                      }
                      className="text-[10px] tracking-wider uppercase"
                    >
                      {book.maturity}
                    </Badge>
                  )}
                </div>
              )}
              {!!book.genres?.length && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {book.genres.map((genre) => (
                    <GenreBadge key={genre} genre={genre} />
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <SaveButton
                itemType="book"
                itemId={book._id}
                initialSaved={saved}
                signedIn={Boolean(email)}
                saveLabel={settings.sections.saveLabel}
                savedLabel={settings.sections.savedLabel}
                signInCopy={{
                  title: settings.sections.accountSignInTitle,
                  body: settings.sections.accountSignInBody,
                  cta: settings.sections.accountSignInCta,
                }}
              />
              <ShareBar
                title={book.title}
                url={absoluteUrl(`/books/${slug}`)}
                label={settings.sections.shareLabel}
                copiedLabel={settings.sections.linkCopiedLabel}
              />
            </div>
            <PortableTextBody value={book.description} />

            {/* The creator, nested in the detail column beside the cover rather
              than in a band of its own. */}
            {creatorCard && (
              <div>
                <SectionHeading as="h3" size="sm">
                  {settings.sections.bookCreatorsHeading}
                </SectionHeading>
                {/* A subtle keyline (the site's --border) with a 15px inset,
                  framing the creator apart from the book's own detail above it.
                  Square corners are the house style. */}
                <div className="border-border border p-[15px]">
                  <ContentCard
                    {...creatorCard}
                    layout="horizontal"
                    summaryLines={4}
                  />
                </div>
              </div>
            )}
          </div>
        </Section>

        {!!book.otherBooks?.length && (
          <ContentCardGrid
            heading={otherBooksHeading}
            headingSize="sm"
            cards={book.otherBooks.map(bookToCard)}
            columns={5}
            padding="md"
            emptyMessage=""
          />
        )}
      </AlternatingSections>
    </div>
  );
}
