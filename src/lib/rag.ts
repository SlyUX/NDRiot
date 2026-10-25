/**
 * Display label for an ND Riot Rag issue — e.g. "ND Riot 003 – Sci Fi Shorts".
 * Shared by the submission form, the home banner, and the user-nav item so the
 * issue reads the same everywhere. Issue number is zero-padded to three digits.
 */
export function ragIssueLabel(
  issueNumber: number | null | undefined,
  title: string | null | undefined,
): string {
  const base =
    issueNumber != null ? `ND Riot ${String(issueNumber).padStart(3, "0")}` : "ND Riot Rag";
  return title ? `${base} – ${title}` : base;
}
