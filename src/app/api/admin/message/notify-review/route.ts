import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { sendEmail } from "@/lib/notify-email";
import { getSiteSettings } from "@/lib/site-settings";
import { getThreadById, setReviewed } from "@/sanity/message-client";
import { ownerEmailOf } from "@/sanity/ownership-client";

const TEAM_REPLY_TO = "submission@ndriot.com";

/**
 * Admin-initiated review of a thread NOBODY reported → notify BOTH participants.
 * The transparency check on moderator access: opening a conversation that wasn't
 * reported is visible to the people in it. Triggered from the messageThread
 * document action in the Operations Studio (same-origin, admin cookie rides along).
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email))
    return NextResponse.json({ ok: false, error: "Not authorized." }, { status: 403 });

  const { threadId } = (await req.json().catch(() => ({}))) as { threadId?: string };
  if (!threadId)
    return NextResponse.json({ ok: false, error: "Missing threadId." }, { status: 400 });

  const thread = await getThreadById(threadId);
  if (!thread)
    return NextResponse.json({ ok: false, error: "Thread not found." }, { status: 404 });

  const emails = (
    await Promise.all((thread.participantIds ?? []).map((id) => ownerEmailOf(id)))
  ).filter((e): e is string => Boolean(e));
  if (emails.length === 0)
    return NextResponse.json(
      { ok: false, error: "No participant emails found." },
      { status: 404 },
    );

  const { notifications: n } = await getSiteSettings();
  await Promise.all(
    emails.map((to) =>
      sendEmail({
        to,
        subject: n.messageReviewedSubject,
        text: n.messageReviewedBody,
        replyTo: TEAM_REPLY_TO,
      }),
    ),
  );
  await setReviewed(threadId);
  return NextResponse.json({ ok: true, notified: emails.length });
}
