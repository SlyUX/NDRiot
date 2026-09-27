import { createClient } from "next-sanity";

import { listGroupSubscribers } from "@/lib/mailerlite";
import { apiVersion, dataset, projectId } from "@/sanity/env";

/**
 * ND Noise subscriber count for the Studio Metrics tool.
 *
 * The count needs MailerLite's server API key, so it can't be fetched from the
 * browser Studio like the Sanity counts. Instead of the ND Riot (Google) login,
 * this is gated by the caller's SANITY session token (which the Studio tool
 * forwards): we verify the token can read THIS Sanity project — i.e. the caller
 * is a project member — then return the MailerLite count. That keeps it on
 * Studio's own auth, no ADMIN_EMAILS / Auth.js.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    return Response.json({ ok: false, error: "Sanity token required." }, { status: 401 });
  }

  // Prove the token belongs to a member of this project (an outside user's token
  // can't read our dataset, so this fetch throws for them).
  try {
    await createClient({ projectId, dataset, apiVersion, useCdn: false, token }).fetch(
      `count(*[_id=="siteSettings"])`,
    );
  } catch {
    return Response.json({ ok: false, error: "Not authorized for this project." }, { status: 403 });
  }

  try {
    const subscribers = (await listGroupSubscribers()).length;
    return Response.json({ ok: true, subscribers });
  } catch (cause) {
    console.error("[noise-count] MailerLite lookup failed", cause);
    return Response.json({ ok: true, subscribers: null });
  }
}
