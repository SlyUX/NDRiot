"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useClient, type Tool } from "sanity";

import { apiVersion } from "../env";

/**
 * Studio "Metrics" tool — a userbase + content readout for tracking the site's
 * scaling.
 *
 * Auth: it queries Sanity with the STUDIO's own authenticated client (your admin
 * session), so it uses Studio's login rather than the separate ND Riot (Google)
 * session — no second sign-in, no ADMIN_EMAILS. Content comes from `production`;
 * account/ownership/follow counts from the private `ndriot_auth` dataset, read
 * via the same admin session (`withConfig`). Every count fails soft to null.
 *
 * The ND Noise subscriber count is the one figure that can't come from Sanity —
 * it needs MailerLite's server API key. We fetch it from `/api/studio/noise-count`,
 * forwarding this Studio session's Sanity token so that endpoint can confirm we're
 * a project member (no separate ND Riot / Google login). If the token isn't
 * available, it falls back to null (shown as "—").
 */

interface Counts {
  creators: number | null;
  ownedProfiles: number | null;
  readers: number | null;
  subscribers: number | null;
  total: number | null;
  over18: number | null;
  teens13to17: number | null;
  creatorsListed: number | null;
  comics: number | null;
  strips: number | null;
  conventions: number | null;
  media: number | null;
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
  const pub = useClient({ apiVersion });
  // Same authenticated session, pointed at the private accounts dataset.
  const authDb = useMemo(
    () => pub.withConfig({ dataset: process.env.SANITY_STUDIO_OWNERSHIP_DATASET ?? "ndriot_auth" }),
    [pub],
  );

  const [data, setData] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [at, setAt] = useState<string | null>(null);

  const runFetch = useCallback(async () => {
    const one = async (c: typeof pub, q: string): Promise<number | null> => {
      try {
        return await c.fetch<number>(q);
      } catch {
        return null;
      }
    };
    // ND Noise subscribers come from MailerLite (server key only), via our
    // endpoint. Forward the Studio session token so it can verify project
    // membership; if the token isn't exposed to the browser client, skip it.
    const subscriberCount = async (): Promise<number | null> => {
      const token = pub.config().token;
      if (!token) return null;
      try {
        const res = await fetch("/api/studio/noise-count", {
          headers: { authorization: `Bearer ${token}` },
        });
        if (!res.ok) return null;
        const body: { ok?: boolean; subscribers?: number | null } = await res.json();
        return body.ok ? body.subscribers ?? null : null;
      } catch {
        return null;
      }
    };
    try {
      const [
        creators,
        ownedProfiles,
        readers,
        subscribers,
        total,
        over18,
        teens13to17,
        creatorsListed,
        comics,
        strips,
        conventions,
        media,
      ] = await Promise.all([
        one(authDb, `count(array::unique(*[_type=="ownership" && defined(email)].email))`),
        one(authDb, `count(*[_type=="ownership"])`),
        one(authDb, `count(array::unique(*[_type=="readerSave" && defined(emailHmac)].emailHmac))`),
        subscriberCount(),
        one(authDb, `count(*[_type=="account"])`),
        one(authDb, `count(*[_type=="account" && isOver18==true])`),
        one(authDb, `count(*[_type=="account" && isOver13==true && isOver18!=true])`),
        one(pub, `count(*[_type=="creator" && defined(slug.current)])`),
        one(pub, `count(*[_type=="book" && defined(slug.current)])`),
        one(pub, `count(*[_type=="strip" && defined(slug.current)])`),
        one(pub, `count(*[_type=="convention" && defined(slug.current)])`),
        one(pub, `count(*[_type=="media" && defined(slug.current)])`),
      ]);
      setData({
        creators,
        ownedProfiles,
        readers,
        subscribers,
        total,
        over18,
        teens13to17,
        creatorsListed,
        comics,
        strips,
        conventions,
        media,
      });
      setAt(new Date().toLocaleString());
    } catch {
      setError("Couldn't load metrics.");
    } finally {
      setLoading(false);
    }
  }, [authDb, pub]);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    void runFetch();
  }, [runFetch]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void runFetch();
  }, [runFetch]);

  return (
    <div style={wrap}>
      <h1 style={h1}>Metrics</h1>
      <p style={sub}>
        Userbase and content, for tracking how the site is scaling.
        {at ? ` As of ${at}.` : ""}
      </p>

      {loading && <p style={sub}>Loading…</p>}
      {error && <p style={{ ...sub, color: "#c0392b" }}>{error}</p>}

      {data && (
        <>
          <h2 style={h2}>Accounts by type</h2>
          <div style={grid}>
            <Metric value={data.creators} label="Creators (claimed a profile)" />
            <Metric value={data.readers} label="Readers (following ≥1)" />
            <Metric value={data.subscribers} label="ND Noise subscribers" />
          </div>
          <p style={{ ...lbl, marginTop: 10 }}>
            “Creators” counts distinct people who own a creator or media profile ({fmt(data.ownedProfiles)}{" "}
            profile{data.ownedProfiles === 1 ? "" : "s"} owned in total). These are derived proxies —
            a full per-tier account census appears here once the age gate ships. ND Noise
            subscribers come live from MailerLite{data.subscribers == null ? " (“—” if unavailable)" : ""}.
          </p>

          {typeof data.total === "number" && data.total > 0 && (
            <>
              <h2 style={h2}>Age-gate accounts</h2>
              <div style={grid}>
                <Metric value={data.total} label="Total accounts" />
                <Metric value={data.over18} label="18 and over" />
                <Metric value={data.teens13to17} label="13–17" />
              </div>
            </>
          )}

          <h2 style={h2}>Content</h2>
          <div style={grid}>
            <Metric value={data.creatorsListed} label="Creators listed" />
            <Metric value={data.comics} label="Comics" />
            <Metric value={data.strips} label="Strips" />
            <Metric value={data.conventions} label="Conventions" />
            <Metric value={data.media} label="Media outlets" />
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
