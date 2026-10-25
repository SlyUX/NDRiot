"use client";

import { useState } from "react";
import type { DocumentActionComponent } from "sanity";

/**
 * Studio document actions for Rag submissions (Submissions workspace): Accept /
 * Resubmit / Decline. The reviewer types an optional line in the submission's
 * "Decision note" field (liveEdit, so it saves immediately); each action reads
 * that note off the document, shows it for confirmation, then posts to the
 * admin-gated `/api/admin/rag-submission/decide` route, which sends the matching
 * templated reply and records the status.
 *
 * Plain elements (not @sanity/ui, which isn't resolvable here); same-origin
 * fetch so the admin login cookie rides along.
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
const muted: React.CSSProperties = { ...para, opacity: 0.7 };
// No fixed background/color — the Studio runs light or dark, so inherit the
// theme's text color and mark the quote with a border instead (a light-grey box
// made the inherited light text nearly invisible in dark mode).
const notePreview: React.CSSProperties = {
  margin: 0,
  paddingLeft: 12,
  fontSize: 13,
  lineHeight: 1.5,
  whiteSpace: "pre-wrap",
  borderLeft: "3px solid #8a8a8a",
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
    const { id, published, draft } = props;
    const doc = (published ?? draft) as Record<string, unknown> | null;
    const note = String((doc?.decisionNote as string | undefined) ?? "").trim();

    const [open, setOpen] = useState(false);
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

    async function send() {
      setSending(true);
      setResult(null);
      try {
        const res = await fetch("/api/admin/rag-submission/decide", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, decision }),
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
            {note ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <p style={{ ...muted, fontWeight: 600 }}>Your note (included in the email):</p>
                <p style={notePreview}>{note}</p>
              </div>
            ) : (
              <p style={muted}>
                No decision note — the reply sends without a personal line. To add one,
                close this, type in the “Decision note” field, then try again.
              </p>
            )}
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
  "Emails the submitter the “congratulations” template for this issue.",
);
export const ResubmitRagAction = makeAction(
  "resubmit",
  "Resubmit — ask for another take",
  "Emails the submitter the “please submit again” template.",
);
export const DeclineRagAction = makeAction(
  "declined",
  "Decline — not this time",
  "Emails the submitter the “not this time” template.",
);
