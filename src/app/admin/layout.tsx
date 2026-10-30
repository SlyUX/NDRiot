import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";

/**
 * Admin tooling (outside the public (site) chrome). Gated here once: any
 * /admin/* route is admin-only — a non-admin or signed-out visitor gets a 404
 * (notFound, not redirect, so the route's existence isn't revealed). Dynamic:
 * the session cookie is read per request.
 */
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) notFound();

  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="border-primary/40 border-b px-6 py-3 print:hidden">
        <div className="mx-auto flex max-w-[70rem] flex-wrap items-center gap-x-5 gap-y-2">
          <Link
            href="/admin/spinner"
            className="text-primary text-sm font-black tracking-widest uppercase"
          >
            ND Riot Admin
          </Link>
          <nav className="ml-auto flex items-center gap-4 text-xs font-bold tracking-widest uppercase">
            <Link
              href="/studio/submissions"
              className="text-muted-foreground hover:text-primary"
            >
              Rag Submissions
            </Link>
            <Link href="/studio" className="text-muted-foreground hover:text-primary">
              Studio
            </Link>
          </nav>
        </div>
      </header>
      {/* pb-28 (112px) keeps content off the bottom edge — the back-office has no
          fixed footer/nav, so content otherwise runs right to the fold. */}
      <main className="mx-auto max-w-[70rem] px-6 pt-8 pb-28 print:mx-0 print:max-w-none print:p-0">
        {children}
      </main>
    </div>
  );
}
