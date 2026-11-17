"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { adminEmails } from "@/lib/admin";
import { rateLimited } from "@/lib/intake/anti-spam";
import { fillTokens, sendEmail } from "@/lib/notify-email";
import { getSiteSettings } from "@/lib/site-settings";
import { absoluteUrl } from "@/lib/site-url";
import { creatorsOwnedBy, ownerEmailOf } from "@/sanity/ownership-client";
import {
  appendMessage,
  blockThread,
  closeThread,
  createReport,
  createThreadRequest,
  getThread,
  getThreadById,
  markThreadRead,
  respondToThread,
  setMuted,
  threadId,
} from "@/sanity/message-client";
import { getWriteClient } from "@/sanity/write-client";

/**
 * Creator-to-creator messaging — the consented handshake + persistent 1:1 thread
 * (parallel to the collab handshake in collab.ts; it does NOT replace it).
 *
 * Gating mirrors collab: only a signed-in creator acts, identity comes from the
 * ownership map, and no address is ever revealed in-app — email notifications go
 * through the private map with a team reply-to. Email fires ONLY at the handshake
 * moments (request, accept, decline), never per message, so inboxes aren't
 * inundated; new messages surface in-app on /me.
 *
 * Write path — prod/preview only (needs SANITY_WRITE_TOKEN + Resend env).
 */

export type MessageResult = { ok: boolean; error?: string };

// Internal mail (admin report alerts) routes to the team, never to a creator.
const TEAM_REPLY_TO = "submission@ndriot.com";
const MAX_NOTE = 1000;
const MAX_BODY = 2000;
const REASONS = ["harassment", "spam", "inappropriate", "other"] as const;

/** Resolve the signed-in creator (identity + email), or an error message. */
async function me(): Promise<{ id: string; email: string } | { error: string }> {
  const session = await auth();
  const email = session?.user?.email?.trim();
  if (!email) return { error: "Sign in to continue." };
  const id = (await creatorsOwnedBy(email))[0];
  if (!id) return { error: "Only creators can message on ND Riot." };
  return { id, email };
}

/** A creator's display name from the public dataset (never their email). */
async function creatorName(id: string): Promise<string | null> {
  return getWriteClient().fetch<string | null>(
    `*[_type=="creator" && _id==$id][0].name`,
    { id },
  );
}

/** Open a request to message another creator. */
export async function requestMessage(input: {
  toId: string;
  note: string;
}): Promise<MessageResult> {
  const self = await me();
  if ("error" in self) return { ok: false, error: self.error };
  const fromId = self.id;
  if (fromId === input.toId) return { ok: false, error: "That’s your own profile." };

  const note = input.note?.trim() ?? "";
  if (!note) return { ok: false, error: "Add a short note to introduce yourself." };
  if (note.length > MAX_NOTE)
    return { ok: false, error: "That note is a bit long — please shorten it." };

  const client = getWriteClient();
  const [fromCreator, toCreator] = await Promise.all([
    client.fetch<{ name: string | null; slug: string | null } | null>(
      `*[_type=="creator" && _id==$id][0]{name, "slug":slug.current}`,
      { id: fromId },
    ),
    client.fetch<{ name: string | null; slug: string | null } | null>(
      `*[_type=="creator" && _id==$id][0]{name, "slug":slug.current}`,
      { id: input.toId },
    ),
  ]);
  if (!toCreator?.slug) return { ok: false, error: "That creator can’t be found." };

  // One thread per pair, ever — any existing thread blocks a fresh request.
  const existing = await getThread(fromId, input.toId);
  if (existing) {
    if (existing.status === "blocked" || existing.status === "declined")
      return { ok: false, error: "You can’t start a conversation with this creator." };
    if (existing.status === "pending")
      return { ok: false, error: "You’ve already sent this creator a request." };
    if (existing.status === "active")
      return { ok: false, error: "You already have a conversation with this creator." };
    return { ok: false, error: "This conversation has ended." };
  }

  if (await rateLimited("message-request"))
    return { ok: false, error: "Too many requests just now — give it a few minutes." };

  const outcome = await createThreadRequest({
    fromId,
    fromName: fromCreator?.name ?? "A creator",
    toId: input.toId,
    toName: toCreator.name ?? "A creator",
    introNote: note,
    createdAt: new Date().toISOString(),
  });
  if (outcome === "exists")
    return { ok: false, error: "You’ve already sent this creator a request." };
  if (outcome === "error")
    return { ok: false, error: "Something went wrong — please try again." };

  // Notify the recipient — their address is never revealed to the requester.
  const [settings, toEmail] = await Promise.all([
    getSiteSettings(),
    ownerEmailOf(input.toId),
  ]);
  if (toEmail) {
    const n = settings.notifications;
    await sendEmail({
      to: toEmail,
      subject: fillTokens(n.messageRequestSubject, {
        from: fromCreator?.name ?? "A creator",
      }),
      text: fillTokens(n.messageRequestBody, {
        to: toCreator.name ?? "there",
        from: fromCreator?.name ?? "A creator",
        profile: absoluteUrl(`/creators/${fromCreator?.slug ?? ""}`),
        note,
        dashboard: absoluteUrl("/me"),
      }),
      replyTo: TEAM_REPLY_TO,
    });
  }

  revalidatePath("/creators/[slug]", "page");
  revalidatePath("/me");
  return { ok: true };
}

/** The recipient accepts or declines a pending request from `fromId`. */
export async function respondMessage(input: {
  fromId: string;
  accept: boolean;
}): Promise<MessageResult> {
  const self = await me();
  if ("error" in self) return { ok: false, error: self.error };
  const toId = self.id;

  const thread = await getThread(input.fromId, toId);
  if (!thread) return { ok: false, error: "That request isn’t available anymore." };
  if (!(thread.participantIds ?? []).includes(toId))
    return { ok: false, error: "That request isn’t yours." };
  // Only the recipient responds — the initiator can't accept their own request.
  if (thread.initiatedById === toId)
    return { ok: false, error: "You can’t respond to your own request." };
  if (thread.status !== "pending")
    return { ok: false, error: "You’ve already responded to this request." };

  const res = await respondToThread({
    threadDocId: threadId(input.fromId, toId),
    accept: input.accept,
    respondedAt: new Date().toISOString(),
  });
  if (res.result === "missing")
    return { ok: false, error: "That request isn’t available anymore." };
  if (res.result === "terminal")
    return { ok: false, error: "You’ve already responded to this request." };

  // Tell the requester the outcome (handshake moment — the one email we send).
  const settings = await getSiteSettings();
  const n = settings.notifications;
  const [fromName, toName, fromEmail] = await Promise.all([
    creatorName(input.fromId),
    creatorName(toId),
    ownerEmailOf(input.fromId),
  ]);
  if (fromEmail) {
    await sendEmail({
      to: fromEmail,
      subject: fillTokens(
        input.accept ? n.messageAcceptedSubject : n.messageDeclinedSubject,
        { to: toName ?? "A creator" },
      ),
      text: fillTokens(
        input.accept ? n.messageAcceptedBody : n.messageDeclinedBody,
        { from: fromName ?? "there", to: toName ?? "A creator", dashboard: absoluteUrl("/me") },
      ),
      replyTo: TEAM_REPLY_TO,
    });
  }

  // Accepting means they've seen the opener — don't badge it as unread.
  if (input.accept) await markThreadRead(toId, threadId(input.fromId, toId));

  revalidatePath("/me");
  return { ok: true };
}

/** Send a message in an active thread. No email — new messages surface in-app. */
export async function sendMessage(input: {
  threadDocId: string;
  body: string;
}): Promise<MessageResult> {
  const self = await me();
  if ("error" in self) return { ok: false, error: self.error };

  const body = input.body?.trim() ?? "";
  if (!body) return { ok: false, error: "Write a message first." };
  if (body.length > MAX_BODY)
    return { ok: false, error: "That message is too long." };
  if (await rateLimited("message-send"))
    return { ok: false, error: "You’re sending very quickly — give it a moment." };

  const res = await appendMessage({
    threadDocId: input.threadDocId,
    fromId: self.id,
    fromName: (await creatorName(self.id)) ?? "A creator",
    body,
    createdAt: new Date().toISOString(),
  });
  if (res === "not-participant")
    return { ok: false, error: "This conversation isn’t yours." };
  if (res === "not-active")
    return { ok: false, error: "This conversation isn’t open." };
  if (res === "error")
    return { ok: false, error: "Something went wrong — please try again." };

  // Sending is reading — advance my marker so my own message isn't "unread".
  await markThreadRead(self.id, input.threadDocId);

  revalidatePath("/me");
  return { ok: true };
}

/** Advance this creator's read marker — called when they open a conversation. */
export async function markRead(input: { threadDocId: string }): Promise<void> {
  const self = await me();
  if ("error" in self) return;
  await markThreadRead(self.id, input.threadDocId);
}

export type ThreadPoll = {
  status: string;
  messages: {
    key: string;
    fromId: string;
    body: string;
    createdAt: string | null;
  }[];
};

/**
 * Fetch an open thread's messages for the near-real-time poll (~2.5s while the
 * conversation is open). Participant-gated; returns null if not allowed. Cheap
 * on purpose — one small doc read, no page re-render.
 */
export async function fetchThreadMessages(input: {
  threadDocId: string;
}): Promise<ThreadPoll | null> {
  const self = await me();
  if ("error" in self) return null;
  const thread = await getThreadById(input.threadDocId);
  if (!thread || !(thread.participantIds ?? []).includes(self.id)) return null;
  return {
    status: thread.status,
    messages: (thread.messages ?? []).map((m) => ({
      key: m._key,
      fromId: m.fromId ?? "",
      body: m.body ?? "",
      createdAt: m.createdAt ?? null,
    })),
  };
}

/** Opt out — the thread closes for both. Terminal. */
export async function optOutMessage(input: {
  threadDocId: string;
}): Promise<MessageResult> {
  const self = await me();
  if ("error" in self) return { ok: false, error: self.error };

  const thread = await getThreadById(input.threadDocId);
  if (!thread || !(thread.participantIds ?? []).includes(self.id))
    return { ok: false, error: "This conversation isn’t yours." };

  if (!(await closeThread(input.threadDocId, self.id)))
    return { ok: false, error: "Something went wrong — please try again." };

  revalidatePath("/me");
  return { ok: true };
}

/** Block the other participant — closes the thread and bars any new request. */
export async function blockMessage(input: {
  threadDocId: string;
}): Promise<MessageResult> {
  const self = await me();
  if ("error" in self) return { ok: false, error: self.error };

  const thread = await getThreadById(input.threadDocId);
  if (!thread || !(thread.participantIds ?? []).includes(self.id))
    return { ok: false, error: "This conversation isn’t yours." };

  if (!(await blockThread(input.threadDocId, self.id)))
    return { ok: false, error: "Something went wrong — please try again." };

  revalidatePath("/me");
  return { ok: true };
}

/** Mute or unmute a conversation — it stays active but drops from the badge. */
export async function toggleMute(input: {
  threadDocId: string;
  muted: boolean;
}): Promise<MessageResult> {
  const self = await me();
  if ("error" in self) return { ok: false, error: self.error };

  const thread = await getThreadById(input.threadDocId);
  if (!thread || !(thread.participantIds ?? []).includes(self.id))
    return { ok: false, error: "This conversation isn’t yours." };

  if (!(await setMuted(self.id, input.threadDocId, input.muted)))
    return { ok: false, error: "Something went wrong — please try again." };

  revalidatePath("/me");
  return { ok: true };
}

/** Report a message (or the thread) for moderator review. */
export async function reportMessage(input: {
  threadDocId: string;
  messageKey: string;
  reason: string;
  note: string;
}): Promise<MessageResult> {
  const self = await me();
  if ("error" in self) return { ok: false, error: self.error };

  const reason = (REASONS as readonly string[]).includes(input.reason)
    ? input.reason
    : "other";

  const thread = await getThreadById(input.threadDocId);
  if (!thread || !(thread.participantIds ?? []).includes(self.id))
    return { ok: false, error: "This conversation isn’t yours." };

  // Snapshot the flagged text so review doesn't depend on the live thread.
  const flagged = (thread.messages ?? []).find((m) => m._key === input.messageKey);
  const reportedText = flagged?.body ?? thread.introNote ?? "";
  const reporterName = (await creatorName(self.id)) ?? "A creator";

  const ok = await createReport({
    reporterId: self.id,
    reporterName,
    threadId: input.threadDocId,
    messageKey: input.messageKey ?? "",
    reportedText,
    reason,
    reporterNote: input.note?.trim() ?? "",
    createdAt: new Date().toISOString(),
  });
  if (!ok) return { ok: false, error: "Something went wrong — please try again." };

  // Internal heads-up so a safety report isn't missed (operational, not reader
  // copy). Reviewed in the Operations Studio "Open" bucket.
  const admins = adminEmails();
  if (admins.length) {
    await Promise.all(
      admins.map((to) =>
        sendEmail({
          to,
          subject: `Message report (${reason}) on ND Riot`,
          text: [
            `${reporterName} reported a message.`,
            `Reason: ${reason}`,
            `Thread: ${input.threadDocId}`,
            "",
            "Review it in Studio → Operations → Message reports (Open).",
          ].join("\n"),
          replyTo: TEAM_REPLY_TO,
        }),
      ),
    );
  }

  revalidatePath("/me");
  return { ok: true };
}
