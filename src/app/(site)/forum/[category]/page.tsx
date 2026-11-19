import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock, Pin } from "lucide-react";

import { ForumNewThread } from "@/components/forum-new-thread";
import { ForumSignedOut } from "@/components/forum-signed-out";
import { Section } from "@/components/ui/section";
import { formatDate } from "@/lib/card-mappers";
import { resolveForumUser } from "@/lib/forum-auth";
import { getSiteSettings } from "@/lib/site-settings";
import {
  getCategoryBySlug,
  readStamps,
  threadsInCategory,
} from "@/sanity/forum-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const [{ category }, settings] = await Promise.all([params, getSiteSettings()]);
  const board = await getCategoryBySlug(category);
  return {
    title: `${board?.title ?? settings.forum.heading} · ${settings.siteTitle}`,
    robots: { index: false, follow: false },
  };
}

export default async function ForumBoardPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const [{ category }, settings, user] = await Promise.all([
    params,
    getSiteSettings(),
    resolveForumUser(),
  ]);
  const copy = settings.forum;
  if (!user) return <ForumSignedOut copy={copy} />;

  const board = await getCategoryBySlug(category);
  if (!board) notFound();

  const [threads, stamps] = await Promise.all([
    threadsInCategory(board._id),
    readStamps(user.id),
  ]);

  const canPost = !board.adminOnlyPosts || user.isAdmin;

  return (
    <Section padding="md" maxWidth="4xl" className="pb-28 md:pb-16">
      <Link
        href="/forum"
        className="text-muted-foreground hover:text-primary focus-visible:ring-primary text-xs font-bold tracking-widest uppercase outline-none focus-visible:ring-2"
      >
        {copy.backToBoardsLabel}
      </Link>

      <div className="mt-4">
        <h1 className="flex items-center gap-2 text-3xl font-black tracking-tighter uppercase">
          {board.title}
          {board.adminOnlyPosts && (
            <Lock className="text-muted-foreground size-5 shrink-0" aria-label="Admin-only posting" />
          )}
        </h1>
        {board.description && (
          <p className="text-muted-foreground mt-2 max-w-prose text-sm">{board.description}</p>
        )}
      </div>

      {canPost && (
        <div className="mt-6">
          <ForumNewThread
            categoryId={board._id}
            categorySlug={board.slug.current}
            copy={copy}
          />
        </div>
      )}

      {!canPost && (
        <p className="text-muted-foreground mt-4 text-sm">{copy.adminOnlyNotice}</p>
      )}

      {threads.length === 0 ? (
        <div className="border-border mt-8 border border-dashed px-6 py-12 text-center">
          <p className="font-black tracking-tight uppercase">{copy.emptyBoardHeading}</p>
          <p className="text-muted-foreground mt-2 text-sm">{copy.emptyBoardBody}</p>
        </div>
      ) : (
        <ul className="border-border divide-border mt-8 divide-y border-y">
          {threads.map((t) => {
            const last = t.lastPostAt ?? t.createdAt ?? null;
            const unread = Boolean(last && last > (stamps.get(t._id) ?? ""));
            return (
              <li key={t._id}>
                <Link
                  href={`/forum/${board.slug.current}/${t._id}`}
                  className="group focus-visible:ring-primary flex items-start gap-3 py-4 outline-none focus-visible:ring-2"
                >
                  {t.pinned && (
                    <Pin className="text-primary mt-0.5 size-4 shrink-0" aria-label="Pinned" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="group-hover:text-primary font-bold">{t.title}</span>
                      {unread && (
                        <span className="bg-primary text-primary-foreground px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase">
                          {copy.newLabel}
                        </span>
                      )}
                      {t.status === "locked" && (
                        <Lock className="text-muted-foreground size-3.5" aria-label="Locked" />
                      )}
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {t.authorName}
                      {last ? ` · ${formatDate(last)}` : ""}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}
