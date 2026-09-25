import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import {
  composeSubscriberEmail,
  fetchSharedStrips,
  fetchUpcomingConventions,
  resolveWindowSince,
} from "@/lib/noise-digest";
import { signUnsubscribe } from "@/lib/noise-token";
import { getSiteSettings } from "@/lib/site-settings";
import { absoluteUrl } from "@/lib/site-url";
import { client } from "@/sanity/client";
import { getWriteClient } from "@/sanity/write-client";
import {
  NOISE_ISSUE_BY_ID_QUERY,
  NOISE_LATEST_DRAFT_QUERY,
} from "@/lib/queries";

/**
 * Admin-only preview of an ND Noise issue — renders the exact email a subscriber
 * would receive, in the browser, WITHOUT sending anything. This is the
 * hard-requirement "see it before it goes out" step.
 *
 * Gate: an Auth.js session whose email is in ADMIN_EMAILS (same as the resend
 * route). By default it previews the latest draft as the ADMIN's own follows;
 * `?email=` previews as any subscriber, `?id=` targets a specific issue.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  const admin = session?.user?.email;
  if (!isAdminEmail(admin)) {
    return new Response("Admin sign-in required.", { status: 403 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const asEmail = (url.searchParams.get("email") ?? admin ?? "").trim().toLowerCase();

  // An explicit id (from the Studio "Preview this draft" action) reads through
  // the token client so an UNPUBLISHED `drafts.` issue can be previewed. The
  // default no-id path reads published issues via the public client.
  const issue = id
    ? await getWriteClient().fetch(NOISE_ISSUE_BY_ID_QUERY, { id })
    : await client.fetch(NOISE_LATEST_DRAFT_QUERY);
  if (!issue) {
    return new Response(
      "No ND Noise issue found. Create an issue in the Studio first (and save it).",
      { status: 404 },
    );
  }

  const settings = await getSiteSettings();
  const since = await resolveWindowSince(issue);
  const [strips, conventions] = await Promise.all([
    fetchSharedStrips(since),
    fetchUpcomingConventions(),
  ]);
  const token = signUnsubscribe(asEmail);
  const unsubscribeUrl = token
    ? absoluteUrl(`/api/noise/unsubscribe?token=${encodeURIComponent(token)}`)
    : absoluteUrl("/noise/unsubscribed");

  const { html } = await composeSubscriberEmail({
    email: asEmail,
    issue,
    settings: settings.noise,
    strips,
    conventions,
    since,
    unsubscribeUrl,
  });

  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
