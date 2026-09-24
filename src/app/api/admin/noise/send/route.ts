import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import {
  composeSubscriberEmail,
  fetchSharedStrips,
  resolveWindowSince,
} from "@/lib/noise-digest";
import { signUnsubscribe } from "@/lib/noise-token";
import { sendEmail } from "@/lib/notify-email";
import { listGroupSubscribers } from "@/lib/mailerlite";
import { getSiteSettings } from "@/lib/site-settings";
import { absoluteUrl } from "@/lib/site-url";
import { client } from "@/sanity/client";
import { getWriteClient } from "@/sanity/write-client";
import {
  NOISE_ISSUE_BY_ID_QUERY,
  NOISE_LATEST_DRAFT_QUERY,
} from "@/lib/queries";

/**
 * Admin-only SEND of an ND Noise issue. Composes each subscriber's personalized
 * email and sends it via Resend, then flips the issue to `sent` and stamps
 * `sentAt` (which seeds the next issue's window).
 *
 * Guardrails, in order: admin session required; the issue must exist and still
 * be a draft (never re-send a sent issue); the subscriber list must load
 * cleanly — if MailerLite errors we refuse outright rather than email a
 * truncated audience. Only after at least one send do we mark the issue sent.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await auth();
  const admin = session?.user?.email;
  if (!isAdminEmail(admin)) {
    return Response.json(
      { ok: false, error: "Admin sign-in required." },
      { status: 403 },
    );
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // No body is fine — default to the latest draft.
  }
  const id = (body as { id?: unknown })?.id;

  const issue =
    typeof id === "string" && id
      ? await client.fetch(NOISE_ISSUE_BY_ID_QUERY, { id })
      : await client.fetch(NOISE_LATEST_DRAFT_QUERY);

  if (!issue) {
    return Response.json(
      { ok: false, error: "No draft issue to send." },
      { status: 404 },
    );
  }
  if (issue.status !== "draft") {
    return Response.json(
      { ok: false, error: "That issue has already been sent." },
      { status: 409 },
    );
  }

  const settings = await getSiteSettings();
  const since = await resolveWindowSince(issue);
  const strips = await fetchSharedStrips();

  let subscribers;
  try {
    subscribers = await listGroupSubscribers();
  } catch (cause) {
    console.error("[noise] subscriber list failed", cause);
    return Response.json(
      { ok: false, error: "Couldn't load the subscriber list — nothing sent." },
      { status: 502 },
    );
  }

  let sent = 0;
  let failed = 0;
  for (const sub of subscribers) {
    const token = signUnsubscribe(sub.email);
    const unsubscribeUrl = token
      ? absoluteUrl(`/api/noise/unsubscribe?token=${encodeURIComponent(token)}`)
      : absoluteUrl("/noise/unsubscribed");
    const { subject, html, text } = await composeSubscriberEmail({
      email: sub.email,
      issue,
      settings: settings.noise,
      strips,
      since,
      unsubscribeUrl,
    });
    const ok = await sendEmail({
      to: sub.email,
      subject,
      text,
      html,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    if (ok) sent += 1;
    else failed += 1;
  }

  // Mark sent only if we actually reached the send stage (list loaded). Even a
  // zero-subscriber issue is "sent" — it closes the window so the next issue
  // starts fresh.
  try {
    await getWriteClient()
      .patch(issue._id)
      .set({ status: "sent", sentAt: new Date().toISOString() })
      .commit();
  } catch (cause) {
    console.error("[noise] marking issue sent failed", cause);
  }

  return Response.json({ ok: true, subscribers: subscribers.length, sent, failed });
}
