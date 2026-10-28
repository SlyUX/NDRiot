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
        <div className="mx-auto flex max-w-[70rem] items-center justify-between gap-4">
          <Link
            href="/admin/spinner"
            className="text-primary text-sm font-black tracking-widest uppercase"
          >
            ND Riot Admin
          </Link>
          <span className="text-muted-foreground text-xs">{session?.user?.email}</span>
        </div>
      </header>
      <main className="mx-auto max-w-[70rem] px-6 py-8 print:mx-0 print:max-w-none print:p-0">
        {children}
      </main>
    </div>
  );
}
