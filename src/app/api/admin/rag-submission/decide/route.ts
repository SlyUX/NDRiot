import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { fillTokens, sendEmail } from "@/lib/notify-email";
import { ragIssueLabel } from "@/lib/rag";
import { getSiteSettings } from "@/lib/site-settings";
import {
  getSubmissionForDecision,
  setSubmissionStatus,
} from "@/sanity/rag-submission-client";

/**
 * Admin-only decision on a Rag submission — the Studio Accept / Resubmit /
 * Decline actions post here. Sends the matching templated reply (with an optional
 * personal note typed in the action dialog) and records the new status.
 *
 * Gate: an Auth.js session whose email is in the admin allow-list. The Submissions
 * Studio workspace is same-origin, so the admin's ND Riot login cookie rides along.
 * The submission (incl. the submitter's email) is read from the PRIVATE dataset.
 */
export const dynamic = "force-dynamic";

const DECISIONS = {
  accepted: { subject: "ragAcceptedSubject", body: "ragAcceptedBody" },
  resubmit: { subject: "ragResubmitSubject", body: "ragResubmitBody" },
  declined: { subject: "ragDeclinedSubject", body: "ragDeclinedBody" },
} as const;

type Decision = keyof typeof DECISIONS;

export async function POST(request: Request) {
  const session = await auth();
  const adminEmail = session?.user?.email;
  if (!adminEmail) {
    return Response.json(
      {
        ok: false,
        error:
          "Not signed in to the ND Riot app. The Studio login is separate — open ndriot.com, sign in with your admin Google account, then try again.",
      },
      { status: 403 },
    );
  }
  if (!isAdminEmail(adminEmail)) {
    return Response.json(
      {
        ok: false,
        error: `Signed in as ${adminEmail}, which isn’t in ADMIN_EMAILS. Add it (and restart the server, since env is read at startup) if it should be an admin.`,
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
  const id = String(b.id ?? "").replace(/^drafts\./, "");
  const decision = String(b.decision ?? "") as Decision;

  if (!id) {
    return Response.json({ ok: false, error: "Missing submission id." }, { status: 400 });
  }
  if (!(decision in DECISIONS)) {
    return Response.json({ ok: false, error: `Unknown decision: ${decision}` }, { status: 400 });
  }

  const submission = await getSubmissionForDecision(id);
  if (!submission) {
    return Response.json({ ok: false, error: "Submission not found." }, { status: 200 });
  }
  if (!submission.submitterEmail) {
    return Response.json(
      { ok: false, error: "No submitter email on record — can’t send a reply." },
      { status: 200 },
    );
  }

  const { notifications } = await getSiteSettings();
  const template = DECISIONS[decision];
  const issue = ragIssueLabel(submission.issueNumber, submission.issueTitle);
  const name = submission.submitterName || submission.creatorName || "there";
  // The optional personal line, typed on the document (liveEdit) before deciding.
  const note = (submission.decisionNote ?? "").trim();

  const sent = await sendEmail({
    to: submission.submitterEmail,
    subject: fillTokens(notifications[template.subject], { name, issue }),
    text: fillTokens(notifications[template.body], { name, issue, note: note ? `${note}\n` : "" }),
    replyTo: "submission@ndriot.com",
  });
  if (!sent) {
    return Response.json(
      { ok: false, error: "Email send failed — check the Resend configuration." },
      { status: 200 },
    );
  }

  // Record the outcome (the note is already on the document via liveEdit).
  try {
    await setSubmissionStatus(id, decision);
  } catch (cause) {
    console.error("[rag-decision] status update failed", cause);
  }

  return Response.json({ ok: true, to: submission.submitterEmail });
}
