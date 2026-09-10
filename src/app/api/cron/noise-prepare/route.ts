import { adminEmails } from "@/lib/admin";
import { fillTokens, sendEmail } from "@/lib/notify-email";
import { getSiteSettings } from "@/lib/site-settings";
import { absoluteUrl } from "@/lib/site-url";
import { client } from "@/sanity/client";
import { getWriteClient } from "@/sanity/write-client";
import {
  NOISE_LAST_SENT_QUERY,
  NOISE_LATEST_DRAFT_QUERY,
} from "@/lib/queries";

/**
 * Monthly "prepare" cron for ND Noise. It does NOT send the newsletter — it
 * readies a draft issue and emails the admin to review + send it (the hard
 * no-blind-send rule). Runs on the 1st of each month (see vercel.json).
 *
 * If a draft already exists (last month's wasn't sent yet), it leaves it alone
 * and re-pings the admin rather than piling up drafts. Otherwise it creates a
 * fresh draft whose window starts at the previous issue's send time, so nothing
 * is missed or repeated. Guarded by CRON_SECRET.
 */
export const dynamic = "force-dynamic";

const MONTH = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const settings = await getSiteSettings();
  const previewLink = absoluteUrl("/api/admin/noise/preview");

  // Reuse an existing unsent draft rather than stacking a new one.
  let issue = await client.fetch(NOISE_LATEST_DRAFT_QUERY);
  let created = false;

  if (!issue) {
    const lastSent = await client.fetch(NOISE_LAST_SENT_QUERY);
    const now = new Date();
    const windowStart =
      lastSent?.sentAt ??
      new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString();
    const label = MONTH.format(now);
    try {
      const doc = await getWriteClient().create({
        _type: "noiseIssue",
        title: label,
        subject: `ND Noise — ${label}`,
        status: "draft",
        windowStart,
      });
      issue = {
        _id: doc._id,
        title: label,
        subject: `ND Noise — ${label}`,
        note: null,
        status: "draft",
        windowStart,
        sentAt: null,
      };
      created = true;
    } catch (cause) {
      console.error("[noise] could not create draft issue", cause);
      return Response.json({ ok: false, error: "create failed" }, { status: 500 });
    }
  }

  // Ping every admin to review it.
  let notified = 0;
  for (const to of adminEmails()) {
    const ok = await sendEmail({
      to,
      subject: settings.noise.reviewReadySubject,
      text: fillTokens(settings.noise.reviewReadyBody, { previewLink }),
    });
    if (ok) notified += 1;
  }

  return Response.json({ ok: true, created, issueId: issue?._id ?? null, notified });
}
