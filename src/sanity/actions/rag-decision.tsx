"use client";

import { useState } from "react";
import type { DocumentActionComponent } from "sanity";

/**
 * Studio document actions for Rag submissions (Submissions workspace): Accept /
 * Resubmit / Decline. Each opens a small dialog with an optional personal note,
 * then posts to the admin-gated `/api/admin/rag-submission/decide` route, which
 * sends the matching templated reply (with the note) and records the status.
 *
 * Same approach as the creator "resend" action — plain elements (not @sanity/ui,
 * which isn't resolvable here), same-origin fetch so the admin login cookie rides
 * along.
 */

type Decision = "accepted" | "resubmit" | "declined";

const wrap: React.CSSProperties = {
  padding: 20,
  display: "flex",
  flexDirection: "column",
  gap: 14,
  maxWidth: 480,
};
const para: React.CSSProperties = { margin: 0, fontSize: 13, lineHeight: 1.5 };
const area: React.CSSProperties = {
  padding: "9px 11px",
  fontSize: 13,
  border: "1px solid #b0b0b0",
  borderRadius: 3,
  width: "100%",
  boxSizing: "border-box",
  minHeight: 80,
  resize: "vertical",
  fontFamily: "inherit",
};
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

function makeAction(
  decision: Decision,
  label: string,
  blurb: string,
): DocumentActionComponent {
  const Action: DocumentActionComponent = (props) => {
    const { id } = props;
    const [open, setOpen] = useState(false);
    const [note, setNote] = useState("");
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

    async function send() {
      setSending(true);
      setResult(null);
      try {
        const res = await fetch("/api/admin/rag-submission/decide", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, decision, note: note.trim() || undefined }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          to?: string;
          error?: string;
        };
        setResult(
          res.ok && data.ok
            ? { ok: true, msg: `Sent to ${data.to}.` }
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
      label,
      onHandle: () => {
        setNote("");
        setResult(null);
        setOpen(true);
      },
      dialog: open && {
        type: "dialog",
        header: label,
        onClose: () => setOpen(false),
        content: (
          <div style={wrap}>
            <p style={para}>{blurb}</p>
            <textarea
              placeholder="Optional note added to the email…"
              value={note}
              onChange={(e) => setNote(e.currentTarget.value)}
              style={area}
            />
            <div style={row}>
              <button type="button" onClick={send} disabled={sending} style={btn}>
                {sending ? "Sending…" : "Send reply"}
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
  return Action;
}

export const AcceptRagAction = makeAction(
  "accepted",
  "Accept — send congratulations",
  "Emails the submitter the “congratulations” template for this issue. Add an optional note below; it’s included in the email.",
);
export const ResubmitRagAction = makeAction(
  "resubmit",
  "Resubmit — ask for another take",
  "Emails the submitter the “please submit again” template. Add an optional note below; it’s included in the email.",
);
export const DeclineRagAction = makeAction(
  "declined",
  "Decline — not this time",
  "Emails the submitter the “not this time” template. Add an optional note below; it’s included in the email.",
);
