"use client";

import { useState } from "react";
import type { DocumentActionComponent } from "sanity";

/**
 * Studio document action for forum moderation (Operations workspace):
 *  - forumReport → "Notify reporter" — emails the reporter the report's outcome
 *    (set status to Actioned/Dismissed first). The reported party is never told.
 *
 * Lock/remove a thread or hide a post by editing the doc's `status` (and
 * `pinned`) field directly — those are editable and save immediately (liveEdit),
 * so no custom action is needed; only the reporter email is.
 *
 * POSTs to an admin-gated, same-origin route so the admin login cookie rides
 * along. Plain elements (not @sanity/ui, which isn't resolvable here).
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

/** forumReport: notify the reporter of the outcome (set status first). */
export const ResolveForumReportAction: DocumentActionComponent = (props) => {
  const { id, published, draft } = props;
  const doc = (published ?? draft) as Record<string, unknown> | null;
  const status = String((doc?.status as string | undefined) ?? "open");
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const ready = status === "actioned" || status === "dismissed";

  async function send() {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/forum/resolve-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: id }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        to?: string;
      };
      setResult(
        res.ok && data.ok
          ? { ok: true, msg: `Sent to ${data.to ?? "reporter"}.` }
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
              <strong>Dismissed</strong> first (it saves immediately), then reopen this.
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
