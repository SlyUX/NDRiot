import { fillTokens, sendEmail } from "@/lib/notify-email";
import { getSiteSettings } from "@/lib/site-settings";
import { absoluteUrl } from "@/lib/site-url";

/** First name for the greeting — the whole name if it's a single token. */
const firstName = (name: string): string =>
  name.trim().split(/\s+/)[0] || name.trim();

/**
 * The "your profile is live — add your comics" email (notification flow ②).
 *
 * One source of truth for BOTH the publish webhook (automatic, on publish) and
 * the Studio "resend" action (manual, admin-triggered), so a creator who is
 * resent this email gets exactly what the system would have sent — same CMS
 * copy, same tokens. Returns whether Resend accepted it.
 */
export async function sendCreatorLiveEmail(args: {
  to: string;
  name: string;
  slug: string | null;
}): Promise<boolean> {
  const n = (await getSiteSettings()).notifications;
  return sendEmail({
    to: args.to,
    subject: n.creatorPublishedSubject,
    text: fillTokens(n.creatorPublishedBody, {
      name: firstName(args.name),
      link: args.slug
        ? absoluteUrl(`/creators/${args.slug}`)
        : absoluteUrl("/creators"),
      booksLink: absoluteUrl("/join/comics"),
    }),
  });
}
