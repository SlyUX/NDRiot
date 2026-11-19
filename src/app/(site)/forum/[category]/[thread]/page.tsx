import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ForumSignedOut } from "@/components/forum-signed-out";
import { ForumThreadView } from "@/components/forum-thread-view";
import { Section } from "@/components/ui/section";
import { forumImageUrl } from "@/lib/forum";
import { resolveForumUser } from "@/lib/forum-auth";
import { getSiteSettings } from "@/lib/site-settings";
import type { ForumPostView } from "@/app/actions/forum";
import {
  getCategoryBySlug,
  getThreadById,
  postsInThread,
} from "@/sanity/forum-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; thread: string }>;
}): Promise<Metadata> {
  const [{ thread }, settings] = await Promise.all([params, getSiteSettings()]);
  const doc = await getThreadById(thread);
  return {
    title: `${doc?.title ?? settings.forum.heading} · ${settings.siteTitle}`,
    robots: { index: false, follow: false },
  };
}

export default async function ForumThreadPage({
  params,
}: {
  params: Promise<{ category: string; thread: string }>;
}) {
  const [{ category, thread }, settings, user] = await Promise.all([
    params,
    getSiteSettings(),
    resolveForumUser(),
  ]);
  const copy = settings.forum;
  if (!user) return <ForumSignedOut copy={copy} />;

  const [doc, board] = await Promise.all([
    getThreadById(thread),
    getCategoryBySlug(category),
  ]);
  // Missing, removed, or a slug that doesn't match the thread's board → 404.
  if (!doc || doc.status === "removed" || !board || doc.category?._ref !== board._id) {
    notFound();
  }

  const rawPosts = await postsInThread(thread);
  const initialPosts: ForumPostView[] = rawPosts.map((p) => {
    const deleted = p.status === "deleted";
    return {
      key: p._id,
      authorId: p.authorId ?? "",
      authorName: p.authorName ?? "A creator",
      body: deleted ? "" : (p.body ?? ""),
      imageUrl: deleted ? null : forumImageUrl(p.image),
      isOpener: Boolean(p.isOpener),
      createdAt: p.createdAt ?? null,
      editedAt: p.editedAt ?? null,
      deleted,
    };
  });

  return (
    <Section padding="md" maxWidth="3xl" className="pb-28 md:pb-16">
      <Link
        href={`/forum/${board.slug.current}`}
        className="text-muted-foreground hover:text-primary focus-visible:ring-primary text-xs font-bold tracking-widest uppercase outline-none focus-visible:ring-2"
      >
        {copy.backToThreadsLabel} {board.title}
      </Link>

      <h1 className="mt-4 text-2xl font-black tracking-tighter uppercase md:text-3xl">
        {doc.title}
      </h1>

      <div className="mt-6">
        <ForumThreadView
          threadId={doc._id}
          status={doc.status}
          meId={user.id}
          initialPosts={initialPosts}
          copy={copy}
        />
      </div>
    </Section>
  );
}
