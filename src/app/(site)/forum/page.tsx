import type { Metadata } from "next";
import Link from "next/link";
import { Lock } from "lucide-react";

import { ForumSignedOut } from "@/components/forum-signed-out";
import { Section } from "@/components/ui/section";
import { formatDate } from "@/lib/card-mappers";
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
  const [settings, user] = await Promise.all([getSiteSettings(), resolveForumUser()]);
  const copy = settings.forum;
  if (!user) return <ForumSignedOut copy={copy} />;

  const [categories, unread, latest] = await Promise.all([
    listCategories(),
    unreadByCategory(user.id),
    latestThreadByCategory(),
  ]);

  return (
    <Section padding="md" maxWidth="4xl" className="pb-28 md:pb-16">
      <h1 className="text-3xl font-black tracking-tighter uppercase">{copy.heading}</h1>
      <p className="text-muted-foreground mt-2 max-w-prose text-sm">{copy.intro}</p>

      <ul className="border-border divide-border mt-8 divide-y border-y">
        {categories.map((cat) => {
          const n = unread.get(cat._id) ?? 0;
          const last = latest.get(cat._id);
          return (
            <li key={cat._id}>
              <Link
                href={`/forum/${cat.slug.current}`}
                className="group focus-visible:ring-primary flex items-start gap-4 py-4 outline-none focus-visible:ring-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="group-hover:text-primary font-black tracking-tight uppercase">
                      {cat.title}
                    </span>
                    {cat.adminOnlyPosts && (
                      <Lock className="text-muted-foreground size-3.5" aria-label="Admin-only posting" />
                    )}
                    {n > 0 && (
                      <span className="bg-primary text-primary-foreground px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase">
                        {copy.newLabel}
                      </span>
                    )}
                  </div>
                  {cat.description && (
                    <p className="text-muted-foreground mt-1 text-sm">{cat.description}</p>
                  )}
                  {last && (
                    <p className="text-muted-foreground mt-1 truncate text-xs">
                      {copy.latestLabel}: {last.title}
                      {last.lastPostAt ? ` · ${formatDate(last.lastPostAt)}` : ""}
                    </p>
                  )}
                </div>
                <span
                  aria-hidden
                  className="text-muted-foreground group-hover:text-primary mt-1 shrink-0"
                >
                  →
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
