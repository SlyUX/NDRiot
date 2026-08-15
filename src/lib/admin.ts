/**
 * The "Admin" role — a small allow-list of emails permitted to run privileged
 * operations (currently: resending notification emails from the Studio).
 *
 * Kept deliberately simple: `ADMIN_EMAILS` is a comma-separated env var checked
 * against the signed-in Auth.js session. There is no admin document type or
 * Sanity role wired in — the Studio and the app authenticate separately, so the
 * Google identity you sign into ND Riot with is what gates admin API routes.
 * Set `ADMIN_EMAILS` in the environment (e.g. "fox@slyux.com").
 */
const ADMIN_EMAILS: readonly string[] = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((entry) => entry.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
