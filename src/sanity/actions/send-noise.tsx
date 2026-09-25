"use client";

import { useState } from "react";
import type { DocumentActionComponent } from "sanity";

/**
 * Studio document action (ND Noise issues): send this issue to every ND Noise
 * subscriber. The counterpart to "Preview this draft" — but because this emails
 * real people and can't be undone, it's gated behind an explicit confirmation
 * dialog and only enabled on a PUBLISHED, not-yet-sent issue.
 *
 * It POSTs to the admin-gated `/api/admin/noise/send` route (same origin, so the
 * admin's ND Riot login cookie rides along), which composes each subscriber's
 * email, sends via Resend, and marks the issue sent. The route reads the
 * PUBLISHED version, so unpublished edits are called out here before sending.
 */

const wrap: React.CSSProperties = {
  padding: 20,
  display: "flex",
  flexDirection: "column",
  gap: 14,
  maxWidth: 460,
};
const para: React.CSSProperties = { margin: 0, fontSize: 13, lineHeight: 1.5 };
const warn: React.CSSProperties = {
  ...para,
  color: "#b06f00",
  fontWeight: 600,
};
const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12 };
const btnSend: React.CSSProperties = {
  padding: "9px 16px",
  fontSize: 13,
  fontWeight: 600,
  borderRadius: 3,
  border: 0,
  background: "#c0392b",
  color: "#fff",
};
const btnCancel: React.CSSProperties = {
  padding: "9px 16px",
  fontSize: 13,
  fontWeight: 600,
  borderRadius: 3,
  border: "1px solid #b0b0b0",
  background: "#fff",
  color: "#111",
};

export const SendNoiseAction: DocumentActionComponent = (props) => {
  const { id, draft, published } = props;
  const status = (published as { status?: string } | null)?.status;
  const alreadySent = status === "sent";
  const hasUnpublished = Boolean(draft);

  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function send() {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/noise/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Target the published version explicitly (its _id is the base id).
        body: JSON.stringify({ id }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        subscribers?: number;
        sent?: number;
        failed?: number;
        error?: string;
      };
      if (res.ok && data.ok) {
        const failed = data.failed ? ` (${data.failed} failed)` : "";
        setResult({
          ok: true,
          msg: `Sent to ${data.sent} subscriber(s)${failed}.`,
        });
      } else {
        setResult({ ok: false, msg: data.error || `Failed (HTTP ${res.status}).` });
      }
    } catch {
      setResult({
        ok: false,
        msg: "Request failed — are you signed in to ND Riot with your admin Google account?",
      });
    } finally {
      setSending(false);
    }
  }

  return {
    label: "Send this issue…",
    tone: "critical",
    disabled: !published || alreadySent,
    title: alreadySent
      ? "This issue has already been sent."
      : !published
        ? "Publish the issue first — sending uses the published version."
        : "Send this issue to every ND Noise subscriber",
    onHandle: () => {
      setResult(null);
      setOpen(true);
    },
    dialog: open && {
      type: "dialog",
      header: "Send this issue?",
      onClose: () => setOpen(false),
      content: (
        <div style={wrap}>
          {result ? (
            // Once the send returns, the confirmation is replaced by the result.
            <>
              <p
                style={{
                  ...para,
                  fontWeight: 600,
                  color: result.ok ? "#1a7f37" : "#c0392b",
                }}
              >
                {result.msg}
              </p>
              <div style={row}>
                {!result.ok && (
                  <button
                    type="button"
                    onClick={() => setResult(null)}
                    style={btnCancel}
                  >
                    Try again
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={btnCancel}
                >
                  Close
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={para}>
                This sends this issue to{" "}
                <strong>every ND Noise subscriber</strong>, right now. It can’t be
                undone. Make sure you’ve used <strong>Preview this draft</strong>{" "}
                first.
              </p>
              {hasUnpublished && (
                <p style={warn}>
                  You have unpublished changes. The send uses the published
                  version — publish first, or your latest edits won’t be included.
                </p>
              )}
              <div style={row}>
                <button
                  type="button"
                  onClick={send}
                  disabled={sending}
                  style={btnSend}
                >
                  {sending ? "Sending…" : "Send now"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={sending}
                  style={btnCancel}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      ),
    },
  };
};
