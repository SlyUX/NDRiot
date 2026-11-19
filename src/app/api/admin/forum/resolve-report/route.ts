import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { sendEmail } from "@/lib/notify-email";
import { getSiteSettings } from "@/lib/site-settings";
import { getForumReportById } from "@/sanity/forum-client";
import { ownerEmailOf } from "@/sanity/ownership-client";

const TEAM_REPLY_TO = "submission@ndriot.com";

/**
 * Notify the REPORTER of a forum report's outcome (actioned / dismissed). The
 * reported party is never told a review happened — only an action, taken
 * separately by editing the thread/post status. Triggered from the forumReport
 * document action in Studio; set the report's status first. Reuses the shared
 * report notification copy (notifications.reportActioned* / reportDismissed*).
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email))
    return NextResponse.json({ ok: false, error: "Not authorized." }, { status: 403 });

  const { reportId } = (await req.json().catch(() => ({}))) as { reportId?: string };
  if (!reportId)
    return NextResponse.json({ ok: false, error: "Missing reportId." }, { status: 400 });

  const report = await getForumReportById(reportId);
  if (!report)
    return NextResponse.json({ ok: false, error: "Report not found." }, { status: 404 });
  if (report.status === "open")
    return NextResponse.json(
      { ok: false, error: "Set the report to Actioned or Dismissed first, then notify." },
      { status: 400 },
    );
  if (!report.reporterId)
    return NextResponse.json({ ok: false, error: "Report has no reporter." }, { status: 400 });

  const reporterEmail = await ownerEmailOf(report.reporterId);
  if (!reporterEmail)
    return NextResponse.json({ ok: false, error: "No reporter email found." }, { status: 404 });

  const { notifications: n } = await getSiteSettings();
  const actioned = report.status === "actioned";
  await sendEmail({
    to: reporterEmail,
    subject: actioned ? n.reportActionedSubject : n.reportDismissedSubject,
    text: actioned ? n.reportActionedBody : n.reportDismissedBody,
    replyTo: TEAM_REPLY_TO,
  });
  return NextResponse.json({ ok: true, to: reporterEmail });
}
