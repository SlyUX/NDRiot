"use client";

import { useState } from "react";
import type { DocumentActionComponent } from "sanity";

/**
 * Studio document actions for messaging moderation (Operations workspace):
 *  - messageThread → "Notify: reviewed" — for an admin-initiated review that
 *    nobody reported, emails BOTH participants (the transparency check on access).
 *  - messageReport → "Notify reporter" — emails the reporter the report's outcome
 *    (set status to Actioned/Dismissed first). The reported party is never told a
 *    review happened.
 *
 * Both POST to admin-gated, same-origin routes so the admin login cookie rides
 * along. Plain elements (not @sanity/ui, which isn't resolvable here); inherit
 * the theme's text color.
 */

const wrap: React.CSSProperties = {
  padding: 20,
  display: "flex",
  flexDirection: "column",
  gap: 14,
  maxWidth: 480,
};
const para: React.CSSProperties = { margin: 0, fontSize: 13, lineHeight: 1.5 };
const muted: React.CSSProperties = { ...para, opacity: 0.7 };
const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12 };
const btn: React.CSSProperties = {
  padding: "9px 16px",
  fontSize: 13,
  fontWeight: 600,
  borderRadius: 3,
  border: 0,
  background: "#111",
  color: "#fff",
};

function useSender(url: string, payload: () => Record<string, unknown>) {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  async function send() {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload()),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        notified?: number;
        to?: string;
      };
      setResult(
        res.ok && data.ok
          ? {
              ok: true,
              msg: data.to
                ? `Sent to ${data.to}.`
                : `Notified ${data.notified ?? 0} participant(s).`,
            }
          : { ok: false, msg: data.error || `Failed (HTTP ${res.status}).` },
      );
    } catch {
      setResult({
        ok: false,
        msg: "Request failed — are you signed in to ND Riot with your admin Google account?",
      });
    } finally {
      setSending(false);
    }
  }
  return { sending, result, setResult, send };
}

/** messageThread: notify both participants of an admin-initiated review. */
export const NotifyReviewAction: DocumentActionComponent = (props) => {
  const { id } = props;
  const [open, setOpen] = useState(false);
  const { sending, result, setResult, send } = useSender(
    "/api/admin/message/notify-review",
    () => ({ threadId: id }),
  );
  return {
    label: "Notify: reviewed",
    onHandle: () => {
      setResult(null);
      setOpen(true);
    },
    dialog: open && {
      type: "dialog",
      header: "Notify participants of review",
      onClose: () => setOpen(false),
      content: (
        <div style={wrap}>
          <p style={para}>
            This emails <strong>both participants</strong> that you reviewed this
            conversation. Use it only for a review <strong>nobody reported</strong> —
            it&rsquo;s the transparency check on admin access.
          </p>
          <p style={muted}>
            For a reported thread, resolve the report instead (the reporter is
            notified there); don&rsquo;t use this, or you&rsquo;d tip off the reported
            party.
          </p>
          <div style={row}>
            <button type="button" onClick={send} disabled={sending} style={btn}>
              {sending ? "Sending…" : "Notify both participants"}
            </button>
            {result && (
              <span style={{ fontSize: 13, color: result.ok ? "#1a7f37" : "#c0392b" }}>
                {result.msg}
              </span>
            )}
          </div>
        </div>
      ),
    },
  };
};

/** messageReport: notify the reporter of the outcome (set status first). */
export const ResolveReportAction: DocumentActionComponent = (props) => {
  const { id, published, draft } = props;
  const doc = (published ?? draft) as Record<string, unknown> | null;
  const status = String((doc?.status as string | undefined) ?? "open");
  const [open, setOpen] = useState(false);
  const { sending, result, setResult, send } = useSender(
    "/api/admin/message/resolve-report",
    () => ({ reportId: id }),
  );
  const ready = status === "actioned" || status === "dismissed";
  return {
    label: "Notify reporter of outcome",
    onHandle: () => {
      setResult(null);
      setOpen(true);
    },
    dialog: open && {
      type: "dialog",
      header: "Notify the reporter",
      onClose: () => setOpen(false),
      content: (
        <div style={wrap}>
          {ready ? (
            <p style={para}>
              Emails the reporter that their report was{" "}
              <strong>{status === "actioned" ? "actioned" : "dismissed"}</strong>. The
              reported party is not told a review happened.
            </p>
          ) : (
            <p style={muted}>
              Set this report&rsquo;s status to <strong>Actioned</strong> or{" "}
              <strong>Dismissed</strong> first (then it saves immediately), and reopen
              this.
            </p>
          )}
          <div style={row}>
            <button
              type="button"
              onClick={send}
              disabled={sending || !ready}
              style={{ ...btn, opacity: ready ? 1 : 0.5 }}
            >
              {sending ? "Sending…" : "Notify reporter"}
            </button>
            {result && (
              <span style={{ fontSize: 13, color: result.ok ? "#1a7f37" : "#c0392b" }}>
                {result.msg}
              </span>
            )}
          </div>
        </div>
      ),
    },
  };
};
