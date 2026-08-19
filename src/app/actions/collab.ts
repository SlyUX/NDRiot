"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { rateLimited } from "@/lib/intake/anti-spam";
import { fillTokens, sendEmail } from "@/lib/notify-email";
import { getSiteSettings, type SiteSettings } from "@/lib/site-settings";
import { absoluteUrl } from "@/lib/site-url";
import {
  COLLAB_RESPONSES,
  GENRES,
  type CollabResponseValue,
} from "@/lib/taxonomy";
import {
  createCollabRequest,
  respondToCollabRequest,
  sentRequest,
  type CollabStatus,
} from "@/sanity/collab-client";
import {
  creatorsOwnedBy,
  ownerEmailOf,
} from "@/sanity/ownership-client";
import { getWriteClient } from "@/sanity/write-client";

/**
 * The creator-to-creator collaboration handshake.
 *
 * Structured + gated: the request carries a chosen genre (no free text), the
 * reply is one of a fixed set of canned lines. One request per creator, ever
 * (enforced by the deterministic id in collab-client). Emails are addressed via
 * the private ownership map — an address is never revealed in-app, and on a
 * mutual "yes" the intro email carries a reply-to so each side's address only
 * surfaces when they choose to reply.
 *
 * Write path — prod/preview only (needs SANITY_WRITE_TOKEN + Resend env).
 */

export type CollabResult = { ok: boolean; error?: string };

// Requests + responses are transactional ND Riot mail; replies route to the
// team, NOT the other creator. Only the intro email reveals a path to the other
// person, and it does so through reply-to, not the visible address.
const TEAM_REPLY_TO = "submission@ndriot.com";

/** The CMS label for a canned response value. */
function responseLabel(settings: SiteSettings, value: CollabResponseValue): string {
  const map: Record<CollabResponseValue, string> = {
    accepted: settings.collab.responseAcceptedLabel,
    maybe: settings.collab.responseMaybeLabel,
    declined: settings.collab.responseDeclinedLabel,
  };
  return map[value];
}

export async function requestCollab(input: {
  toId: string;
  genre: string;
}): Promise<CollabResult> {
  const session = await auth();
  const email = session?.user?.email?.trim();
  if (!email) return { ok: false, error: "Sign in to send a request." };

  // The requester's own creator profile is the sender.
  const fromId = (await creatorsOwnedBy(email))[0];
  if (!fromId)
    return { ok: false, error: "Only creators can request a collaboration." };
  if (fromId === input.toId)
    return { ok: false, error: "That's your own profile." };

  // Genre must be a real one — no free text anywhere in this flow.
  const genre = (GENRES as readonly string[]).includes(input.genre)
    ? input.genre
    : null;
  if (!genre) return { ok: false, error: "Pick a genre for your request." };

  const client = getWriteClient();
  const target = await client.fetch<{
    name: string | null;
    slug: string | null;
    openToCollaboration: boolean | null;
  } | null>(
    `*[_type=="creator" && _id==$id][0]{name, "slug":slug.current, openToCollaboration}`,
    { id: input.toId },
  );
  if (!target?.slug)
    return { ok: false, error: "That creator can't be found." };
  if (!target.openToCollaboration)
    return {
      ok: false,
      error: "That creator isn't open to collaboration right now.",
    };

  // One request per creator, ever.
  if (await sentRequest(fromId, input.toId))
    return {
      ok: false,
      error: "You've already sent your one request to this creator.",
    };

  if (await rateLimited("collab-request"))
    return {
      ok: false,
      error: "Too many requests just now — give it a few minutes.",
    };

  const outcome = await createCollabRequest({
    fromId,
    fromEmail: email,
    toId: input.toId,
    genre,
    createdAt: new Date().toISOString(),
  });
  if (outcome === "exists")
    return {
      ok: false,
      error: "You've already sent your one request to this creator.",
    };
  if (outcome === "error")
    return { ok: false, error: "Something went wrong — please try again." };

  // Notify the recipient. No address is revealed; the body explains the privacy
  // paradigm + that this is the requester's single, no-obligation request.
  const [settings, fromCreator, toEmail] = await Promise.all([
    getSiteSettings(),
    client.fetch<{ name: string | null; slug: string | null } | null>(
      `*[_type=="creator" && _id==$id][0]{name, "slug":slug.current}`,
      { id: fromId },
    ),
    ownerEmailOf(input.toId),
  ]);
  if (toEmail) {
    const n = settings.notifications;
    await sendEmail({
      to: toEmail,
      subject: fillTokens(n.collabRequestSubject, {
        from: fromCreator?.name ?? "A creator",
      }),
      text: fillTokens(n.collabRequestBody, {
        to: target.name ?? "there",
        from: fromCreator?.name ?? "A creator",
        genre,
        profile: absoluteUrl(`/creators/${fromCreator?.slug ?? ""}`),
        dashboard: absoluteUrl("/me"),
      }),
      replyTo: TEAM_REPLY_TO,
    });
  }

  revalidatePath("/creators/[slug]", "page");
  revalidatePath("/me");
  return { ok: true };
}

export async function respondCollab(input: {
  fromId: string;
  response: CollabResponseValue;
}): Promise<CollabResult> {
  const session = await auth();
  const email = session?.user?.email?.trim();
  if (!email) return { ok: false, error: "Sign in to respond." };

  // The responder must own the creator the request was sent TO.
  const toId = (await creatorsOwnedBy(email))[0];
  if (!toId) return { ok: false, error: "Only creators can respond." };

  const option = COLLAB_RESPONSES.find((o) => o.value === input.response);
  if (!option) return { ok: false, error: "Pick a response." };

  const settings = await getSiteSettings();
  const label = responseLabel(settings, input.response);
  const result = await respondToCollabRequest({
    fromId: input.fromId,
    toId,
    status: input.response as CollabStatus,
    response: label,
    respondedAt: new Date().toISOString(),
  });
  if (!result)
    return { ok: false, error: "That request isn't available anymore." };

  const client = getWriteClient();
  const n = settings.notifications;
  const [fromCreator, toCreator, toEmail] = await Promise.all([
    client.fetch<{ name: string | null } | null>(
      `*[_type=="creator" && _id==$id][0]{name}`,
      { id: input.fromId },
    ),
    client.fetch<{ name: string | null } | null>(
      `*[_type=="creator" && _id==$id][0]{name}`,
      { id: toId },
    ),
    option.accepts ? ownerEmailOf(toId) : Promise.resolve(null),
  ]);

  // Tell the requester the canned answer — closure either way.
  await sendEmail({
    to: result.fromEmail,
    subject: fillTokens(n.collabResponseSubject, {
      to: toCreator?.name ?? "A creator",
    }),
    text: fillTokens(n.collabResponseBody, {
      from: fromCreator?.name ?? "there",
      to: toCreator?.name ?? "A creator",
      genre: result.genre ?? "",
      response: label,
    }),
    replyTo: TEAM_REPLY_TO,
  });

  // On "yes", introduce them by email — each reply-to the other, so an address
  // only surfaces when someone actually replies.
  if (option.accepts) {
    const intro = (you: string, other: string) =>
      fillTokens(n.collabIntroBody, {
        you,
        other,
        genre: result.genre ?? "",
      });
    await Promise.all([
      sendEmail({
        to: result.fromEmail,
        subject: fillTokens(n.collabIntroSubject, {
          other: toCreator?.name ?? "",
        }),
        text: intro(fromCreator?.name ?? "there", toCreator?.name ?? "them"),
        replyTo: toEmail ?? TEAM_REPLY_TO,
      }),
      toEmail
        ? sendEmail({
            to: toEmail,
            subject: fillTokens(n.collabIntroSubject, {
              other: fromCreator?.name ?? "",
            }),
            text: intro(toCreator?.name ?? "there", fromCreator?.name ?? "them"),
            replyTo: result.fromEmail,
          })
        : Promise.resolve(false),
    ]);
  }

  revalidatePath("/me");
  return { ok: true };
}
