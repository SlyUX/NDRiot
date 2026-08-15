import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { sendCreatorLiveEmail } from "@/lib/notify-creator";
import { client } from "@/sanity/client";
import { ownerEmailOf } from "@/sanity/ownership-client";
import { markNotified } from "@/sanity/notify-store";

/**
 * Admin-only manual resend of a notification email — the Studio "Resend" action
 * posts here.
 *
 * Why it exists: creators who joined before notifications shipped, or who
 * stalled mid-process, never got the automatic email. This re-sends it on
 * demand, byte-identical to the automatic one (shared `sendCreatorLiveEmail`),
 * bypassing the once-only marker (a manual resend is a deliberate override).
 *
 * Gate: the request must carry an Auth.js session whose email is in the
 * `ADMIN_EMAILS` allow-list. The Studio is same-origin (ndriot.com/studio), so
 * the admin's ND Riot login cookie rides along on the fetch.
 *
 * Only `creatorLive` (flow ②) is supported today; the shape leaves room for more.
 */
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const session = await auth();
  const admin = session?.user?.email;
  if (!isAdminEmail(admin)) {
    return Response.json(
      {
        ok: false,
        error:
          "Admin sign-in required. Sign in to ND Riot with your admin Google account.",
      },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Bad request." }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const docId = String(b.docId ?? "").replace(/^drafts\./, "");
  const kind = String(b.kind ?? "");
  const override = String(b.to ?? "").trim();

  if (!docId)
    return Response.json(
      { ok: false, error: "Missing document id." },
      { status: 400 },
    );
  if (kind !== "creatorLive") {
    return Response.json(
      { ok: false, error: `Unsupported notification kind: ${kind}` },
      { status: 400 },
    );
  }
  if (override && !EMAIL_RE.test(override)) {
    return Response.json(
      { ok: false, error: "That override address is not a valid email." },
      { status: 400 },
    );
  }

  // Recipient: the explicit override, else the recorded owner.
  const to = override || (await ownerEmailOf(docId));
  if (!to) {
    return Response.json(
      {
        ok: false,
        error:
          "No owner email on record for this creator — enter an address to send to.",
      },
      { status: 200 },
    );
  }

  // Read the published creator for the greeting + profile link.
  let creator: { name: string | null; slug: string | null } | null = null;
  try {
    creator = await client.fetch<{
      name: string | null;
      slug: string | null;
    } | null>(
      `*[_type=="creator" && _id==$id][0]{ name, "slug": slug.current }`,
      { id: docId },
    );
  } catch {
    return Response.json(
      { ok: false, error: "Could not read the creator." },
      { status: 200 },
    );
  }
  if (!creator) {
    return Response.json(
      {
        ok: false,
        error:
          "Creator not found — publish the profile before sending its “you’re live” email.",
      },
      { status: 200 },
    );
  }

  const sent = await sendCreatorLiveEmail({
    to,
    name: creator.name ?? "",
    slug: creator.slug,
  });
  if (!sent) {
    return Response.json(
      {
        ok: false,
        error: "Email send failed — check the Resend configuration.",
      },
      { status: 200 },
    );
  }

  // Record it, so a later publish of this same profile doesn't auto-send a
  // duplicate. (Manual resends always run regardless of the marker.)
  await markNotified("creator-live", docId);
  return Response.json({ ok: true, to });
}
