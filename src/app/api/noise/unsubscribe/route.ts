import { removeFromNoiseGroup } from "@/lib/mailerlite";
import { verifyUnsubscribe } from "@/lib/noise-token";
import { absoluteUrl } from "@/lib/site-url";

/**
 * One-click unsubscribe for ND Noise. The digest is sent via Resend, so we own
 * the unsubscribe: the footer link and the `List-Unsubscribe` header both point
 * here with a signed token carrying the subscriber's email.
 *
 * GET (a person clicking the footer link) → remove from the MailerLite group,
 * then redirect to a friendly confirmation page. POST (RFC 8058 one-click, sent
 * by Gmail/Yahoo via `List-Unsubscribe-Post`) → remove and return 200. A bad or
 * forged token is treated as "nothing to do" rather than an error.
 */
export const dynamic = "force-dynamic";

async function unsubscribe(token: string | null): Promise<boolean> {
  if (!token) return false;
  const email = verifyUnsubscribe(token);
  if (!email) return false;
  return removeFromNoiseGroup(email);
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  await unsubscribe(token);
  // Redirect regardless — the confirmation page is generic, so it never reveals
  // whether a given token/email was valid.
  return Response.redirect(absoluteUrl("/noise/unsubscribed"), 303);
}

export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  await unsubscribe(token);
  return new Response(null, { status: 200 });
}
