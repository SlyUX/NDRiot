"use client";

import type { DocumentActionComponent } from "sanity";

/**
 * Studio document action (ND Noise issues): open the admin email preview for
 * THIS issue in a new tab — the exact email a subscriber would receive, with no
 * send. The hard "see it before it goes out" step, one click from the document.
 *
 * The preview route (`/api/admin/noise/preview?id=…`) is admin-gated by the
 * Auth.js session, so the admin must also be signed in to ND Riot (Google) in
 * the same browser — same assumption as the resend action. It reads the exact
 * id, so an UNPUBLISHED draft previews via its `drafts.` id.
 */
export const PreviewNoiseAction: DocumentActionComponent = (props) => {
  const { id, draft, published } = props;
  // Prefer the working draft's content; fall back to the published version.
  const previewId = draft ? `drafts.${id}` : id;
  const hasDoc = Boolean(draft || published);

  return {
    label: "Preview this draft",
    disabled: !hasDoc,
    title: hasDoc
      ? "Open the exact email for this issue in a new tab (no send)"
      : "Save the issue first, then preview it.",
    onHandle: () => {
      window.open(
        `/api/admin/noise/preview?id=${encodeURIComponent(previewId)}`,
        "_blank",
        "noopener,noreferrer",
      );
      props.onComplete();
    },
  };
};
