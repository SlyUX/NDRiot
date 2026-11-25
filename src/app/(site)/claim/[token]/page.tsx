import type { Metadata } from "next";
import Link from "next/link";

import { auth } from "@/auth";
import { SignInButton } from "@/components/auth-controls";
import { ClaimButton } from "@/components/claim-button";
import { Section } from "@/components/ui/section";
import {
  safeFetch,
  CLAIM_CONTEXT_QUERY,
  CREATOR_NAME_QUERY,
} from "@/lib/queries";
import { getSiteSettings } from "@/lib/site-settings";
import { creatorsOwnedBy } from "@/sanity/ownership-client";
import { getClaim } from "@/sanity/credit-claim-client";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: `${settings.sections.claimHeading} · ${settings.siteTitle}`,
    robots: { index: false },
  };
}

/**
 * Claim a credit from a shareable link. The collaborator signs in and claims the
 * credit as their creator; claiming is consent, so the credit links + confirms
 * in one step (see claimCredit). Noindex — a private, one-time invite surface.
 */
export default async function ClaimPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [settings, session, claim] = await Promise.all([
    getSiteSettings(),
    auth(),
    getClaim(token),
  ]);
  const c = settings.sections;
  const common = settings.creatorIntake;

  const heading = (
    <h1 className="text-4xl font-black tracking-tighter uppercase sm:text-5xl">
      {c.claimHeading}
    </h1>
  );

  // Invalid / already-claimed links are dead ends by design.
  if (!claim || claim.status === "revoked") {
    return (
      <Section padding="md" maxWidth="3xl">
        {heading}
        <p className="text-muted-foreground mt-6 text-sm">{c.claimInvalid}</p>
      </Section>
    );
  }
  if (claim.status === "claimed") {
    return (
      <Section padding="md" maxWidth="3xl">
        {heading}
        <p className="text-muted-foreground mt-6 text-sm">{c.claimAlready}</p>
      </Section>
    );
  }

  const context = await safeFetch<{
    book: { title: string | null; slug: string | null } | null;
    inviter: { name: string | null } | null;
  }>(
    CLAIM_CONTEXT_QUERY,
    { bookId: claim.bookId, inviterId: claim.inviterId ?? "" },
    { book: null, inviter: null },
  );
  const title = context.book?.title ?? "a comic";
  const roles = (claim.roles ?? []).join(", ");
  const comicHref = context.book?.slug ? `/comics/${context.book.slug}` : null;
  const body = c.claimBody
    .replace("{roles}", roles)
    .replace("{title}", title);

  const email = session?.user?.email ?? null;
  const owned = email ? await creatorsOwnedBy(email) : [];
  const me =
    owned.length > 0
      ? await safeFetch<{ name: string | null; slug: string | null } | null>(
          CREATOR_NAME_QUERY,
          { id: owned[0] },
          null,
        )
      : null;

  return (
    <Section padding="md" maxWidth="3xl">
      {heading}
      <p className="text-foreground mt-6 max-w-prose text-sm">{body}</p>

      <div className="mt-10">
        {!email ? (
          <SignInButton label={c.claimSignIn} redirectTo={`/claim/${token}`} />
        ) : owned.length === 0 ? (
          <div className="space-y-4">
            <p className="text-muted-foreground max-w-prose text-sm">
              {c.claimNeedProfile}
            </p>
            <Link
              href="/join/creators"
              className="text-primary text-sm font-semibold tracking-widest uppercase underline underline-offset-4"
            >
              {c.claimCreateProfile}
            </Link>
          </div>
        ) : (
          <ClaimButton
            token={token}
            label={c.claimButton.replace("{name}", me?.name ?? "me")}
            doneLabel={c.claimDone}
            comicHref={comicHref}
            comicTitle={title}
          />
        )}
      </div>

      <p className="text-muted-foreground mt-8 text-xs">
        {common.signedInLabel}{" "}
        {email ? <span className="text-foreground">{email}</span> : "—"}
      </p>
    </Section>
  );
}
