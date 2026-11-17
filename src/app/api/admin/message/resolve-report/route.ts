import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { sendEmail } from "@/lib/notify-email";
import { getSiteSettings } from "@/lib/site-settings";
import { getReportById } from "@/sanity/message-client";
import { ownerEmailOf } from "@/sanity/ownership-client";

const TEAM_REPLY_TO = "submission@ndriot.com";

/**
 * Notify the REPORTER of a report's outcome (actioned / dismissed). The reported
 * party is never told a review happened — only an action, which the moderator
 * takes separately — so a report neither tips off the reported party nor exposes
 * the reporter. Triggered from the messageReport document action in Studio; set
 * the report's status to Actioned or Dismissed first.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email))
    return NextResponse.json({ ok: false, error: "Not authorized." }, { status: 403 });

  const { reportId } = (await req.json().catch(() => ({}))) as { reportId?: string };
  if (!reportId)
    return NextResponse.json({ ok: false, error: "Missing reportId." }, { status: 400 });

  const report = await getReportById(reportId);
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
    return NextResponse.json(
      { ok: false, error: "No reporter email found." },
      { status: 404 },
    );

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
