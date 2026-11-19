"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { adminEmails, isAdminEmail } from "@/lib/admin";
import { forumImageUrl } from "@/lib/forum";
import { rateLimited } from "@/lib/intake/anti-spam";
import { sendEmail } from "@/lib/notify-email";
import { creatorsOwnedBy } from "@/sanity/ownership-client";
import {
  createForumReport,
  createPost,
  createThread,
  deletePost,
  editPost,
  getCategoryById,
  getPostById,
  getThreadById,
  markThreadRead,
  postsInThread,
  uploadForumImage,
} from "@/sanity/forum-client";
import { getWriteClient } from "@/sanity/write-client";

/**
 * The roster-gated community forum — threads, posts, edit/delete, report, and
 * the near-real-time poll. Gating mirrors messaging: only a signed-in creator
 * acts, identity comes from the ownership map, and the author name is read from
 * the PUBLIC dataset (never the email). The whole forum lives in the private
 * `ndriot_auth` dataset.
 *
 * Write path — prod/preview only (needs SANITY_WRITE_TOKEN).
 */

export type ForumResult = { ok: boolean; error?: string; threadId?: string };

const MAX_TITLE = 140;
const MAX_BODY = 5000;
const REASONS = ["harassment", "spam", "inappropriate", "other"] as const;

/** Resolve the signed-in creator (identity + email), or an error message. */
async function me(): Promise<{ id: string; email: string } | { error: string }> {
  const session = await auth();
  const email = session?.user?.email?.trim();
  if (!email) return { error: "Sign in to continue." };
  const id = (await creatorsOwnedBy(email))[0];
  if (!id) return { error: "Only creators can post on ND Riot." };
  return { id, email };
}

/** A creator's display name from the public dataset (never their email). */
async function creatorName(id: string): Promise<string> {
  const name = await getWriteClient().fetch<string | null>(
    `*[_type=="creator" && _id==$id][0].name`,
    { id },
  );
  return name ?? "A creator";
}

/** Shared gate for opening a thread on a board: board exists, and admin-only
 *  boards require an admin. Returns an error string or null. */
async function canOpenThread(
  categoryId: string,
  email: string,
): Promise<string | null> {
  const category = await getCategoryById(categoryId);
  if (!category) return "That board doesn’t exist.";
  if (category.adminOnlyPosts && !isAdminEmail(email))
    return "Only ND Riot can start threads on this board.";
  return null;
}

/* ------------------------------------------------------------ threads */

/** Open a new thread (text only). */
export async function createForumThread(input: {
  categoryId: string;
  title: string;
  body: string;
}): Promise<ForumResult> {
  const self = await me();
  if ("error" in self) return { ok: false, error: self.error };

  const title = input.title?.trim() ?? "";
  if (!title) return { ok: false, error: "Give your thread a title." };
  if (title.length > MAX_TITLE)
    return { ok: false, error: "That title is a bit long — please shorten it." };

  const body = input.body?.trim() ?? "";
  if (!body) return { ok: false, error: "Write your opening post." };
  if (body.length > MAX_BODY) return { ok: false, error: "That post is too long." };

  const blocked = await canOpenThread(input.categoryId, self.email);
  if (blocked) return { ok: false, error: blocked };

  if (await rateLimited("forum-thread"))
    return { ok: false, error: "You’re posting very quickly — give it a moment." };

  const result = await createThread({
    categoryId: input.categoryId,
    authorId: self.id,
    authorName: await creatorName(self.id),
    title,
    body,
    createdAt: new Date().toISOString(),
  });
  if ("error" in result)
    return { ok: false, error: "Something went wrong — please try again." };

  await markThreadRead(self.id, result.threadId);
  revalidatePath("/forum");
  return { ok: true, threadId: result.threadId };
}

/** Open a new thread with an attached image (optional — the opening post's
 *  body is required even so). FormData so the downscaled File can ride along. */
export async function createForumThreadImage(
  formData: FormData,
): Promise<ForumResult> {
  const self = await me();
  if ("error" in self) return { ok: false, error: self.error };

  const categoryId = String(formData.get("categoryId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { ok: false, error: "Give your thread a title." };
  if (title.length > MAX_TITLE)
    return { ok: false, error: "That title is a bit long — please shorten it." };

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { ok: false, error: "Write your opening post." };
  if (body.length > MAX_BODY) return { ok: false, error: "That post is too long." };

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, error: "Add an image first." };

  const blocked = await canOpenThread(categoryId, self.email);
  if (blocked) return { ok: false, error: blocked };

  if (await rateLimited("forum-thread"))
    return { ok: false, error: "You’re posting very quickly — give it a moment." };

  const uploaded = await uploadForumImage(file, `forum-${Date.now()}.jpg`);
  if ("error" in uploaded) return { ok: false, error: uploaded.error };

  const result = await createThread({
    categoryId,
    authorId: self.id,
    authorName: await creatorName(self.id),
    title,
    body,
    imageAssetId: uploaded.assetId,
    createdAt: new Date().toISOString(),
  });
  if ("error" in result)
    return { ok: false, error: "Something went wrong — please try again." };

  await markThreadRead(self.id, result.threadId);
  revalidatePath("/forum");
  return { ok: true, threadId: result.threadId };
}

/* ------------------------------------------------------------ posts */

/** Reply to a thread (text only). */
export async function createForumPost(input: {
  threadId: string;
  body: string;
}): Promise<ForumResult> {
  const self = await me();
  if ("error" in self) return { ok: false, error: self.error };

  const body = input.body?.trim() ?? "";
  if (!body) return { ok: false, error: "Write a reply first." };
  if (body.length > MAX_BODY) return { ok: false, error: "That reply is too long." };

  if (await rateLimited("forum-post"))
    return { ok: false, error: "You’re posting very quickly — give it a moment." };

  const res = await createPost({
    threadId: input.threadId,
    authorId: self.id,
    authorName: await creatorName(self.id),
    body,
    createdAt: new Date().toISOString(),
  });
  if (res === "locked")
    return { ok: false, error: "This thread is closed to new replies." };
  if (res === "error")
    return { ok: false, error: "Something went wrong — please try again." };

  await markThreadRead(self.id, input.threadId);
  revalidatePath(`/forum`);
  return { ok: true };
}

/** Reply with an attached image (optional caption). */
export async function createForumPostImage(
  formData: FormData,
): Promise<ForumResult> {
  const self = await me();
  if ("error" in self) return { ok: false, error: self.error };

  const threadId = String(formData.get("threadId") ?? "");
  if (!threadId) return { ok: false, error: "That thread isn’t available." };

  const body = String(formData.get("body") ?? "").trim();
  if (body.length > MAX_BODY) return { ok: false, error: "That reply is too long." };

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, error: "Add an image first." };

  if (await rateLimited("forum-post"))
    return { ok: false, error: "You’re posting very quickly — give it a moment." };

  const uploaded = await uploadForumImage(file, `forum-${Date.now()}.jpg`);
  if ("error" in uploaded) return { ok: false, error: uploaded.error };

  const res = await createPost({
    threadId,
    authorId: self.id,
    authorName: await creatorName(self.id),
    body,
    imageAssetId: uploaded.assetId,
    createdAt: new Date().toISOString(),
  });
  if (res === "locked")
    return { ok: false, error: "This thread is closed to new replies." };
  if (res === "error")
    return { ok: false, error: "Something went wrong — please try again." };

  await markThreadRead(self.id, threadId);
  revalidatePath(`/forum`);
  return { ok: true };
}

/* ------------------------------------------------------- edit / delete */

/** Edit your own post (text; optionally drop the attached image). The prior
 *  version is kept in the post's revision history. */
export async function editForumPost(input: {
  postId: string;
  body: string;
  removeImage?: boolean;
}): Promise<ForumResult> {
  const self = await me();
  if ("error" in self) return { ok: false, error: self.error };

  const body = input.body?.trim() ?? "";
  if (!body) return { ok: false, error: "A post can’t be empty." };
  if (body.length > MAX_BODY) return { ok: false, error: "That post is too long." };

  const res = await editPost({
    postId: input.postId,
    authorId: self.id,
    body,
    removeImage: input.removeImage,
    editedAt: new Date().toISOString(),
  });
  if (res === "not-author")
    return { ok: false, error: "You can only edit your own posts." };
  if (res === "error")
    return { ok: false, error: "Something went wrong — please try again." };

  revalidatePath(`/forum`);
  return { ok: true };
}

/** Edit your own post AND replace its image. */
export async function editForumPostImage(
  formData: FormData,
): Promise<ForumResult> {
  const self = await me();
  if ("error" in self) return { ok: false, error: self.error };

  const postId = String(formData.get("postId") ?? "");
  if (!postId) return { ok: false, error: "That post isn’t available." };

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { ok: false, error: "A post can’t be empty." };
  if (body.length > MAX_BODY) return { ok: false, error: "That post is too long." };

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, error: "Add an image first." };

  const uploaded = await uploadForumImage(file, `forum-${Date.now()}.jpg`);
  if ("error" in uploaded) return { ok: false, error: uploaded.error };

  const res = await editPost({
    postId,
    authorId: self.id,
    body,
    imageAssetId: uploaded.assetId,
    editedAt: new Date().toISOString(),
  });
  if (res === "not-author")
    return { ok: false, error: "You can only edit your own posts." };
  if (res === "error")
    return { ok: false, error: "Something went wrong — please try again." };

  revalidatePath(`/forum`);
  return { ok: true };
}

/** Delete your own post. It becomes a tombstone; the record is kept. */
export async function deleteForumPost(input: {
  postId: string;
}): Promise<ForumResult> {
  const self = await me();
  if ("error" in self) return { ok: false, error: self.error };

  const res = await deletePost({
    postId: input.postId,
    authorId: self.id,
    deletedAt: new Date().toISOString(),
  });
  if (res === "not-author")
    return { ok: false, error: "You can only delete your own posts." };
  if (res === "error")
    return { ok: false, error: "Something went wrong — please try again." };

  revalidatePath(`/forum`);
  return { ok: true };
}

/* ------------------------------------------------------------ report */

/** Report a post for moderator review. Snapshots the flagged text. */
export async function reportForumPost(input: {
  postId: string;
  reason: string;
  note: string;
}): Promise<ForumResult> {
  const self = await me();
  if ("error" in self) return { ok: false, error: self.error };

  const reason = (REASONS as readonly string[]).includes(input.reason)
    ? input.reason
    : "other";

  const post = await getPostById(input.postId);
  if (!post) return { ok: false, error: "That post isn’t available." };

  const reporterName = await creatorName(self.id);
  const ok = await createForumReport({
    reporterId: self.id,
    reporterName,
    threadId: post.thread?._ref ?? "",
    postId: input.postId,
    reportedText: post.body ?? "",
    reason,
    reporterNote: input.note?.trim() ?? "",
    createdAt: new Date().toISOString(),
  });
  if (!ok) return { ok: false, error: "Something went wrong — please try again." };

  const admins = adminEmails();
  if (admins.length) {
    await Promise.all(
      admins.map((to) =>
        sendEmail({
          to,
          subject: `Forum report (${reason}) on ND Riot`,
          text: [
            `${reporterName} reported a forum post.`,
            `Reason: ${reason}`,
            `Post: ${input.postId}`,
            "",
            "Review it in Studio → Operations → Forum reports (Open).",
          ].join("\n"),
        }).catch(() => undefined),
      ),
    );
  }

  return { ok: true };
}

/* --------------------------------------------------------- read + poll */

/** Advance this creator's read marker — called when they open a thread. */
export async function markForumThreadRead(input: {
  threadId: string;
}): Promise<void> {
  const self = await me();
  if ("error" in self) return;
  await markThreadRead(self.id, input.threadId);
}

export type ForumPostView = {
  key: string;
  authorId: string;
  authorName: string;
  body: string;
  imageUrl: string | null;
  isOpener: boolean;
  createdAt: string | null;
  editedAt: string | null;
  deleted: boolean;
};

export type ThreadPoll = {
  status: string;
  posts: ForumPostView[];
};

/**
 * Fetch a thread's posts for the near-real-time poll (~2.5s while open).
 * Roster-gated (any signed-in creator can read the forum). A deleted post ships
 * NO body or image — only a tombstone marker — so removed content never reaches
 * the client. A removed thread returns null.
 */
export async function fetchThreadPosts(input: {
  threadId: string;
}): Promise<ThreadPoll | null> {
  const self = await me();
  if ("error" in self) return null;
  const thread = await getThreadById(input.threadId);
  if (!thread || thread.status === "removed") return null;

  const posts = await postsInThread(input.threadId);
  return {
    status: thread.status,
    posts: posts.map((p) => {
      const deleted = p.status === "deleted";
      return {
        key: p._id,
        authorId: p.authorId ?? "",
        authorName: p.authorName ?? "A creator",
        body: deleted ? "" : (p.body ?? ""),
        imageUrl: deleted ? null : forumImageUrl(p.image),
        isOpener: Boolean(p.isOpener),
        createdAt: p.createdAt ?? null,
        editedAt: p.editedAt ?? null,
        deleted,
      };
    }),
  };
}
