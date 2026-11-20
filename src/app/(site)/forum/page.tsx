import type { Metadata } from "next";

import { ForumBoardList } from "@/components/forum-board-list";
import { ForumSignedOut } from "@/components/forum-signed-out";
import { Section } from "@/components/ui/section";
import { resolveForumUser } from "@/lib/forum-auth";
import { getSiteSettings } from "@/lib/site-settings";
import {
  latestThreadByCategory,
  listCategories,
  unreadByCategory,
} from "@/sanity/forum-client";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: `${settings.forum.heading} · ${settings.siteTitle}`,
    robots: { index: false, follow: false },
  };
}

export default async function ForumPage() {
  const [settings, user] = await Promise.all([
    getSiteSettings(),
    resolveForumUser(),
  ]);
  const copy = settings.forum;
  if (!user) return <ForumSignedOut copy={copy} />;

  const [categories, unread, latest] = await Promise.all([
    listCategories(),
    unreadByCategory(user.id),
    latestThreadByCategory(),
  ]);

  return (
    <Section padding="md" maxWidth="4xl" className="pb-28 md:pb-16">
      <h1 className="text-3xl font-black tracking-tighter uppercase">
        {copy.heading}
      </h1>
      <p className="text-muted-foreground mt-2 max-w-prose text-sm">
        {copy.intro}
      </p>

      <div className="mt-8">
        <ForumBoardList
          categories={categories}
          unread={unread}
          latest={latest}
          newLabel={copy.newLabel}
          latestLabel={copy.latestLabel}
        />
      </div>
    </Section>
  );
}
