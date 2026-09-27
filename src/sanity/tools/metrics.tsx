"use client";

import { useCallback, useEffect, useState } from "react";
import type { Tool } from "sanity";

/**
 * Studio "Metrics" tool — a userbase + content readout for tracking the site's
 * scaling. Reads the admin-gated `/api/admin/stats` route (same origin, so the
 * admin's ND Riot login cookie rides along); the private-dataset token stays on
 * the server. Styled with plain elements (@sanity/ui isn't resolvable here).
 */

interface Stats {
  ok: boolean;
  generatedAt?: string;
  accounts?: {
    creators: number | null;
    ownedProfiles: number | null;
    readers: number | null;
    subscribers: number | null;
    total: number | null;
    over18: number | null;
    teens13to17: number | null;
  };
  content?: {
    creatorsListed: number | null;
    comics: number | null;
    strips: number | null;
    conventions: number | null;
    media: number | null;
  };
  error?: string;
}

const wrap: React.CSSProperties = {
  padding: 32,
  maxWidth: 760,
  margin: "0 auto",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
};
const h1: React.CSSProperties = { fontSize: 22, fontWeight: 800, margin: "0 0 4px 0" };
const sub: React.CSSProperties = { fontSize: 13, color: "#6b7280", margin: "0 0 24px 0" };
const h2: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#6b7280",
  margin: "28px 0 12px 0",
};
const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
  gap: 12,
};
const card: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 6,
  padding: "14px 16px",
  background: "#fff",
};
const num: React.CSSProperties = { fontSize: 28, fontWeight: 800, lineHeight: 1.1 };
const lbl: React.CSSProperties = { fontSize: 12, color: "#6b7280", marginTop: 4 };
const btn: React.CSSProperties = {
  padding: "7px 14px",
  fontSize: 13,
  fontWeight: 600,
  borderRadius: 4,
  border: "1px solid #b0b0b0",
  background: "#fff",
  cursor: "pointer",
};

const fmt = (n: number | null | undefined): string =>
  n == null ? "—" : n.toLocaleString("en-US");

function Metric({ value, label }: { value: number | null | undefined; label: string }) {
  return (
    <div style={card}>
      <div style={num}>{fmt(value)}</div>
      <div style={lbl}>{label}</div>
    </div>
  );
}

function MetricsView() {
  const [data, setData] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The fetch itself sets state only AFTER the await, so it's safe to call from
  // an effect (loading already initializes to true — no synchronous set needed).
  const runFetch = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats", { headers: { Accept: "application/json" } });
      const body = (await res.json().catch(() => ({}))) as Stats;
      if (!res.ok || !body.ok) {
        setError(
          body.error ||
            (res.status === 403
              ? "Sign in to ND Riot with your admin Google account to view metrics."
              : `Couldn't load metrics (HTTP ${res.status}).`),
        );
        setData(null);
      } else {
        setData(body);
      }
    } catch {
      setError("Request failed — are you signed in to ND Riot as an admin?");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    void runFetch();
  }, [runFetch]);

  // Fetch on mount. runFetch only sets state after awaiting, so this is a
  // legitimate data-fetching effect (the rule can't tell async from sync here).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void runFetch();
  }, [runFetch]);

  const a = data?.accounts;
  const c = data?.content;

  return (
    <div style={wrap}>
      <h1 style={h1}>Metrics</h1>
      <p style={sub}>
        Userbase and content, for tracking how the site is scaling.
        {data?.generatedAt ? ` As of ${new Date(data.generatedAt).toLocaleString()}.` : ""}
      </p>

      {loading && <p style={sub}>Loading…</p>}
      {error && <p style={{ ...sub, color: "#c0392b" }}>{error}</p>}

      {a && (
        <>
          <h2 style={h2}>Accounts by type</h2>
          <div style={grid}>
            <Metric value={a.creators} label="Creators (claimed a profile)" />
            <Metric value={a.readers} label="Readers (following ≥1)" />
            <Metric value={a.subscribers} label="Newsletter subscribers" />
          </div>
          <p style={{ ...lbl, marginTop: 10 }}>
            “Creators” counts distinct people who own a creator or media profile ({fmt(a.ownedProfiles)}{" "}
            profile{a.ownedProfiles === 1 ? "" : "s"} owned in total). These are derived proxies — a
            full per-tier account census appears here once the age gate ships.
          </p>

          {typeof a.total === "number" && a.total > 0 && (
            <>
              <h2 style={h2}>Age-gate accounts</h2>
              <div style={grid}>
                <Metric value={a.total} label="Total accounts" />
                <Metric value={a.over18} label="18 and over" />
                <Metric value={a.teens13to17} label="13–17" />
              </div>
            </>
          )}
        </>
      )}

      {c && (
        <>
          <h2 style={h2}>Content</h2>
          <div style={grid}>
            <Metric value={c.creatorsListed} label="Creators listed" />
            <Metric value={c.comics} label="Comics" />
            <Metric value={c.strips} label="Strips" />
            <Metric value={c.conventions} label="Conventions" />
            <Metric value={c.media} label="Media outlets" />
          </div>
        </>
      )}

      <div style={{ marginTop: 28 }}>
        <button type="button" onClick={refresh} disabled={loading} style={btn}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>
    </div>
  );
}

export const metricsTool: Tool = {
  name: "metrics",
  title: "Metrics",
  component: MetricsView,
};
