import type { Metadata } from "next";
import Link from "next/link";

import { auth } from "@/auth";
import { SignInButton, SignOutButton } from "@/components/auth-controls";
import {
  CreatorIntakeForm,
  type CreatorIntakeInitial,
  type CreatorIntakeOrg,
} from "@/components/creator-intake-form";
import PortableTextBody from "@/components/PortableTextBody";
import { TheDeal } from "@/components/the-deal";
import { Section } from "@/components/ui/section";
import {
  safeFetch,
  INTAKE_OWNED_CREATORS_QUERY,
  INTAKE_CREATOR_EDIT_QUERY,
  INTAKE_ORGANIZATIONS_QUERY,
  INTAKE_STUDIO_ORG_IDS_QUERY,
} from "@/lib/queries";
import { getSiteSettings } from "@/lib/site-settings";
import type { SanityImage } from "@/lib/types";
import { editableDraftPreferred } from "@/sanity/intake-reads";
import { creatorsOwnedBy } from "@/sanity/ownership-client";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  return {
    title: `${settings.join.heading} · ${settings.siteTitle}`,
    description: settings.siteDescription,
  };
}

/** The raw editable shape from INTAKE_CREATOR_EDIT_QUERY. */
type EditProfile = {
  _id: string;
  name: string | null;
  slug: string | null;
  place: { city: string | null; region: string | null } | null;
  website: string | null;
  feedUrl: string | null;
  bioText: string | null;
  socials: { platform: string | null; url: string | null }[] | null;
  works: { label: string | null; url: string | null }[] | null;
  genres: string[] | null;
  formats: string[] | null;
  openToCollaboration: boolean | null;
  photo: SanityImage | null;
  photoAlt: string | null;
  studioId: string | null;
  studioName: string | null;
  studioWebsite: string | null;
  studioLogo: SanityImage | null;
  orgIds: string[] | null;
};

/** Turn a fetched profile into the flat, form-shaped `initial` values. */
function toInitial(p: EditProfile): CreatorIntakeInitial {
  return {
    updateId: p._id,
    name: p.name ?? "",
    slug: p.slug ?? "",
    city: p.place?.city ?? "",
    region: p.place?.region ?? "",
    website: p.website ?? "",
    feedUrl: p.feedUrl ?? "",
    bio: p.bioText ?? "",
    socials: (p.socials ?? []).map((s) => ({
      platform: s.platform ?? "",
      url: s.url ?? "",
    })),
    works: (p.works ?? []).map((w) => ({
      label: w.label ?? "",
      url: w.url ?? "",
    })),
    genres: p.genres ?? [],
    formats: p.formats ?? [],
    collab: p.openToCollaboration ?? false,
    photo: p.photo ?? null,
    photoAlt: p.photoAlt ?? "",
    studioId: p.studioId ?? null,
    studioName: p.studioName ?? "",
    studioWebsite: p.studioWebsite ?? "",
    studioLogo: p.studioLogo ?? null,
    orgIds: p.orgIds ?? [],
  };
}

/**
 * The way in.
 *
 * Google sign-in is required to create or manage a profile — it establishes
 * ownership so a profile stays in its owner's hands (the reputational point).
 * Signed out, the page shows the sign-in prompt (Google sign-in is the only way in).
 * Signed in, the update picker lists only the profiles this email owns, and the
 * form writes a review draft a human still publishes.
 */
export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{
    editing?: string | string[];
    new?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const editingId = Array.isArray(params.editing)
    ? params.editing[0]
    : params.editing;
  // `?new` = "I want to create another profile" — now the entry to the
  // one-profile-per-account explanation, not a second blank form.
  const wantsNew = params.new !== undefined;

  const [settings, session] = await Promise.all([getSiteSettings(), auth()]);
  const { heading, editHeading, body } = settings.join;
  const intake = settings.creatorIntake;
  const email = session?.user?.email ?? null;

  // Signed out: prompt to sign in (the native, signed-in flow is the only way in).
  if (!email) {
    return (
      <Section padding="md" maxWidth="3xl">
        <h1 className="text-4xl font-black tracking-tighter uppercase sm:text-5xl">
          {heading}
        </h1>
        {/* The deal, before the sign-in wall — reassure the wary creator first. */}
        <TheDeal text={settings.join.terms} className="mt-6" />
        {body && (
          <div className="mt-6">
            <PortableTextBody value={body} />
          </div>
        )}
        <div className="mt-12 space-y-4">
          <h2 className="text-2xl font-black tracking-tighter uppercase">
            {intake.signInPrompt}
          </h2>
          <p className="text-muted-foreground max-w-prose text-sm">
            {intake.signInBody}
          </p>
          <SignInButton
            label={intake.signInButton}
            redirectTo="/join/creators"
          />
        </div>
      </Section>
    );
  }

  // Signed in: only this email's own profiles are editable.
  const ownedIds = await creatorsOwnedBy(email);
  const alreadyHasProfile = ownedIds.length > 0;

  // One profile per Google account. Someone who wants to create ANOTHER while
  // already owning one can't — a second profile on the same account causes data
  // conflicts we can't yet resolve. Explain it, and point at the real path:
  // sign out and use a separate Google account.
  if (wantsNew && alreadyHasProfile) {
    return (
      <Section padding="md" maxWidth="3xl">
        <h1 className="text-4xl font-black tracking-tighter uppercase sm:text-5xl">
          {intake.oneProfileHeading}
        </h1>
        <p className="text-muted-foreground mt-6 max-w-prose text-sm">
          {intake.oneProfileBody}
        </p>
        <div className="border-primary/20 mt-8 flex flex-col items-start gap-4 border-t pt-6">
          <span className="text-muted-foreground text-xs tracking-widest uppercase">
            {intake.signedInLabel}{" "}
            <span className="text-foreground">{email}</span>
          </span>
          <SignOutButton
            label={intake.signOutLabel}
            redirectTo="/join/creators"
          />
          <Link
            href="/join/creators"
            className="text-primary text-sm underline underline-offset-4"
          >
            {editHeading} →
          </Link>
        </div>
      </Section>
    );
  }

  const [organizations, studioIds, ownedCreators] = await Promise.all([
    safeFetch<CreatorIntakeOrg[]>(INTAKE_ORGANIZATIONS_QUERY, {}, []),
    safeFetch<string[]>(INTAKE_STUDIO_ORG_IDS_QUERY, {}, []),
    ownedIds.length
      ? safeFetch<CreatorIntakeOrg[]>(
          INTAKE_OWNED_CREATORS_QUERY,
          { ids: ownedIds },
          [],
        )
      : Promise.resolve<CreatorIntakeOrg[]>([]),
  ]);
  // Collectives excludes orgs used as any creator's studio (there is no
  // studio/collective flag on the org itself — see INTAKE_STUDIO_ORG_IDS_QUERY).
  const studioIdSet = new Set(studioIds);
  const collectives = organizations.filter((o) => !studioIdSet.has(o._id));

  // One profile per account, so a signed-in owner always lands in editing it —
  // never a blank create form. Explicit ?editing you own wins; otherwise the one
  // profile you own; create mode (undefined) only when you own none.
  const targetEditId =
    editingId && ownedIds.includes(editingId) ? editingId : ownedIds[0];
  const canEdit = Boolean(targetEditId);
  // Prefer the draft so a creator's pending (unreviewed) edits prepopulate.
  const editProfile = canEdit
    ? await editableDraftPreferred<EditProfile>(
        INTAKE_CREATOR_EDIT_QUERY,
        targetEditId!,
      )
    : null;
  const initial = editProfile ? toInitial(editProfile) : undefined;

  return (
    <Section padding="md" maxWidth="3xl">
      {/* "Update Profile" for a returning owner, "Get Listed" for a new one. */}
      <h1 className="text-4xl font-black tracking-tighter uppercase sm:text-5xl">
        {initial ? editHeading : heading}
      </h1>

      <TheDeal text={settings.join.terms} className="mt-6" />

      {body && (
        <div className="mt-6">
          <PortableTextBody value={body} />
        </div>
      )}

      {/* Which account is signed in, and the way out. */}
      <div className="border-primary/20 mt-8 flex flex-wrap items-center justify-between gap-3 border-b pb-4 text-xs">
        <span className="text-muted-foreground tracking-widest uppercase">
          {intake.signedInLabel}{" "}
          <span className="text-foreground">{email}</span>
        </span>
        <SignOutButton
          label={intake.signOutLabel}
          redirectTo="/join/creators"
        />
      </div>

      {/* Books live on their own page, scoped to the creators you own. */}
      <p className="mt-4 text-xs">
        <Link
          href="/join/books"
          className="text-primary tracking-widest uppercase underline underline-offset-4"
        >
          {settings.bookIntake.heading} →
        </Link>
      </p>

      <div className="mt-8 space-y-6">
        <div>
          <h2 className="text-2xl font-black tracking-tighter uppercase">
            {initial ? intake.editHeading : intake.heading}
          </h2>
          {!initial && (
            <p className="text-muted-foreground mt-2 text-sm">{intake.intro}</p>
          )}
        </div>
        {/* Keyed so switching profiles (or back to new) remounts the form. */}
        <CreatorIntakeForm
          key={initial?.updateId ?? "new"}
          copy={intake}
          reviewNotice={settings.reviewNotice}
          organizations={organizations}
          collectives={collectives}
          creators={ownedCreators}
          initial={initial}
        />
      </div>
    </Section>
  );
}
