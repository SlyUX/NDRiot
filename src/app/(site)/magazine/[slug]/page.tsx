import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AlternatingSections } from "@/components/alternating-sections";
import { ContentCardGrid } from "@/components/content-card-grid";
import { RagIssueView } from "@/components/rag-issue-view";
import { RagSubmissionForm } from "@/components/rag-submission-form";
import { SectionHeading } from "@/components/section-heading";
import { Section } from "@/components/ui/section";
import { auth } from "@/auth";
import { ragIssueToCard } from "@/lib/card-mappers";
import { pageMetadata } from "@/lib/page-metadata";
import {
  safeFetch,
  RAG_ISSUE_QUERY,
  RAG_ISSUES_QUERY,
  RAG_OPEN_SUBMISSIONS_QUERY,
} from "@/lib/queries";
import { getSiteSettings } from "@/lib/site-settings";
import { creatorsOwnedBy } from "@/sanity/ownership-client";
import type { RagIssueDetail, RagIssueSummary, RagOpenSubmission } from "@/lib/types";

/** A single Rag issue — the featured layout on its own page, plus other issues. */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [issue, settings] = await Promise.all([
    safeFetch<RagIssueDetail | null>(RAG_ISSUE_QUERY, { slug }, null),
    getSiteSettings(),
  ]);
  if (!issue) return {};
  return pageMetadata({
    title: `${settings.sections.ragPageTitle} · Issue ${issue.issueNumber}`,
    description: issue.description ?? undefined,
    path: `/magazine/${slug}`,
    siteTitle: settings.siteTitle,
  });
}

export default async function RagIssuePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [issue, issues, settings] = await Promise.all([
    safeFetch<RagIssueDetail | null>(RAG_ISSUE_QUERY, { slug }, null),
    safeFetch<RagIssueSummary[]>(RAG_ISSUES_QUERY, {}, []),
    getSiteSettings(),
  ]);
  if (!issue) notFound();

  const s = settings.sections;
  const others = issues.filter((i) => i._id !== issue._id);

  // While submissions are open this issue isn't published yet, so its page shows
  // the submit form (to signed-in creators) in place of the buy/ToC content.
  let submission: React.ReactNode = undefined;
  if (issue.acceptingSubmissions) {
    const session = await auth();
    const email = session?.user?.email ?? undefined;
    const isCreator = email ? (await creatorsOwnedBy(email)).length > 0 : false;
    const openIssues = await safeFetch<RagOpenSubmission[]>(
      RAG_OPEN_SUBMISSIONS_QUERY,
      {},
      [],
    );
    submission = (
      <div className="space-y-5">
        <SectionHeading as="h2" size="sm">
          {s.ragSubmitHeading}
        </SectionHeading>
        <p className="text-foreground/85 max-w-prose text-sm">{s.ragSubmitIntro}</p>
        {isCreator ? (
          <RagSubmissionForm
            copy={{
              heading: s.ragSubmitHeading,
              intro: s.ragSubmitIntro,
              issueLabel: s.ragSubmitIssueLabel,
              pitchLabel: s.ragSubmitPitchLabel,
              pitchHelp: s.ragSubmitPitchHelp,
              pagesLabel: s.ragSubmitPagesLabel,
              samplesLabel: s.ragSubmitSamplesLabel,
              samplesHelp: s.ragSubmitSamplesHelp,
              linkLabel: s.ragSubmitLinkLabel,
              button: s.ragSubmitButton,
              success: s.ragSubmitSuccess,
            }}
            openIssues={openIssues}
            currentIssueId={issue._id}
            csamNotice={settings.reviewNotice.csamUploadNotice}
          />
        ) : (
          <p className="text-muted-foreground max-w-prose text-sm">{s.ragSubmitNote}</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <AlternatingSections>
        <Section padding="md" maxWidth="3xl">
          <RagIssueView
            issue={issue}
            headingAs="h1"
            submission={submission}
            labels={{
              read: s.ragReadLabel,
              download: s.ragDownloadLabel,
              buyHeading: s.ragBuyHeading,
              tocHeading: s.ragTocHeading,
              contributorsHeading: s.ragContributorsHeading,
            }}
          />
        </Section>

        {others.length > 0 && (
          <ContentCardGrid
            heading={s.ragOtherHeading}
            headingSize="sm"
            cards={others.map(ragIssueToCard)}
            columns={4}
            padding="md"
            maxWidth="3xl"
            emptyMessage=""
          />
        )}
      </AlternatingSections>
    </div>
  );
}
