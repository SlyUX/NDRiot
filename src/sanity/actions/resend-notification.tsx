"use client";

import { useState } from "react";
import type { DocumentActionComponent } from "sanity";

/**
 * Studio document action (creator docs): manually resend the "your profile is
 * live — add your comics" notification email. For creators who joined before
 * notifications shipped, stalled mid-process, or never added comics — route them
 * back through the system instead of a hand-written email.
 *
 * The action posts to the admin-gated `/api/admin/resend-notification` route
 * (same origin, so the admin's ND Riot login cookie rides along). Styled with
 * plain elements rather than @sanity/ui, which isn't resolvable here.
 */

const wrap: React.CSSProperties = {
  padding: 20,
  display: "flex",
  flexDirection: "column",
  gap: 14,
  maxWidth: 460,
};
const para: React.CSSProperties = { margin: 0, fontSize: 13, lineHeight: 1.5 };
const input: React.CSSProperties = {
  padding: "9px 11px",
  fontSize: 13,
  border: "1px solid #b0b0b0",
  borderRadius: 3,
  width: "100%",
  boxSizing: "border-box",
};
const row: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};
const btn: React.CSSProperties = {
  padding: "9px 16px",
  fontSize: 13,
  fontWeight: 600,
  borderRadius: 3,
  border: 0,
  background: "#111",
  color: "#fff",
};

export const ResendCreatorLiveAction: DocumentActionComponent = (props) => {
  const { id, published } = props;
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );

  async function send() {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/resend-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docId: id,
          kind: "creatorLive",
          to: to.trim() || undefined,
        }),
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
    label: "Resend “profile is live” email",
    disabled: !published,
    title: published
      ? "Resend the published-profile email to the owner"
      : "Publish the profile first — there’s no live profile to announce.",
    onHandle: () => {
      setTo("");
      setResult(null);
      setOpen(true);
    },
    dialog: open && {
      type: "dialog",
      header: "Resend “profile is live” email",
      onClose: () => setOpen(false),
      content: (
        <div style={wrap}>
          <p style={para}>
            Sends the “your profile is live — add your comics” email — the same
            one the system sends automatically on publish — to this creator’s
            owner. Leave the field blank to use the recorded owner, or enter an
            address to override (e.g. if no owner email is on record).
          </p>
          <input
            type="email"
            placeholder="owner@example.com (optional override)"
            value={to}
            onChange={(e) => setTo(e.currentTarget.value)}
            style={input}
          />
          <div style={row}>
            <button type="button" onClick={send} disabled={sending} style={btn}>
              {sending ? "Sending…" : "Send email"}
            </button>
            {result && (
              <span
                style={{
                  fontSize: 13,
                  color: result.ok ? "#1a7f37" : "#c0392b",
                }}
              >
                {result.msg}
              </span>
            )}
          </div>
        </div>
      ),
    },
  };
};
