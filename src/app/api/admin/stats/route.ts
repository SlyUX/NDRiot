import { createClient } from "next-sanity";

import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { listGroupSubscribers } from "@/lib/mailerlite";
import { client } from "@/sanity/client";
import { apiVersion, projectId } from "@/sanity/env";

/**
 * Admin-only userbase + content metrics for the Studio "Metrics" tool.
 *
 * Counts come from two datasets: the public `production` (content) and the
 * private `ndriot_auth` (accounts/ownership/follows) — the private one is read
 * with the server write token, which is why this lives behind an admin-gated
 * route rather than being queried from the browser Studio.
 *
 * Account "types" today are DERIVED proxies (creators = claimed profiles;
 * readers = people who follow ≥1 thing; subscribers = newsletter). The true
 * per-tier account census (13-17 / 18+) fills in once the age gate ships and
 * `account` docs exist. Every count fails soft to null so one flaky query never
 * blanks the whole panel.
 */
export const dynamic = "force-dynamic";

let cachedAuthClient: ReturnType<typeof createClient> | null = null;
function authClient() {
  if (cachedAuthClient) return cachedAuthClient;
  const token = process.env.SANITY_WRITE_TOKEN ?? process.env.CREATOR_SCRIPT;
  cachedAuthClient = createClient({
    projectId,
    dataset: process.env.SANITY_OWNERSHIP_DATASET ?? "ndriot_auth",
    apiVersion,
    useCdn: false,
    token,
  });
  return cachedAuthClient;
}

async function safeCount(fetcher: () => Promise<number>): Promise<number | null> {
  try {
    return await fetcher();
  } catch (cause) {
    console.error("[stats] count failed", cause);
    return null;
  }
}

export async function GET() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) {
    return Response.json(
      { ok: false, error: "Admin sign-in required." },
      { status: 403 },
    );
  }

  const a = authClient();

  const [
    creators,
    ownedProfiles,
    readers,
    accounts,
    accountsOver18,
    accounts13to17,
    subscribers,
    creatorsListed,
    comics,
    strips,
    conventions,
    media,
  ] = await Promise.all([
    // Accounts (derived) — from the private dataset.
    safeCount(() => a.fetch<number>(`count(array::unique(*[_type=="ownership" && defined(email)].email))`)),
    safeCount(() => a.fetch<number>(`count(*[_type=="ownership"])`)),
    safeCount(() => a.fetch<number>(`count(array::unique(*[_type=="readerSave" && defined(emailHmac)].emailHmac))`)),
    // Age-gate account census (0 until the gate ships).
    safeCount(() => a.fetch<number>(`count(*[_type=="account"])`)),
    safeCount(() => a.fetch<number>(`count(*[_type=="account" && isOver18==true])`)),
    safeCount(() => a.fetch<number>(`count(*[_type=="account" && isOver13==true && isOver18!=true])`)),
    // Newsletter subscribers (MailerLite).
    safeCount(async () => (await listGroupSubscribers()).length),
    // Content-scaling snapshot — from the public dataset.
    safeCount(() => client.fetch<number>(`count(*[_type=="creator" && defined(slug.current)])`)),
    safeCount(() => client.fetch<number>(`count(*[_type=="book" && defined(slug.current)])`)),
    safeCount(() => client.fetch<number>(`count(*[_type=="strip" && defined(slug.current)])`)),
    safeCount(() => client.fetch<number>(`count(*[_type=="convention" && defined(slug.current)])`)),
    safeCount(() => client.fetch<number>(`count(*[_type=="media" && defined(slug.current)])`)),
  ]);

  return Response.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    accounts: {
      creators, // distinct people who own a creator/media profile
      ownedProfiles, // profiles claimed (a person may own more than one)
      readers, // distinct people who follow ≥1 thing
      subscribers, // newsletter subscribers (MailerLite)
      total: accounts, // age-gate account docs (0 until the gate ships)
      over18: accountsOver18,
      teens13to17: accounts13to17,
    },
    content: { creatorsListed, comics, strips, conventions, media },
  });
}
