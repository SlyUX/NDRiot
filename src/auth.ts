import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

/**
 * Auth.js (v5) — Google sign-in, strictly for identity validation.
 *
 * We delegate identity to Google and manage no passwords or accounts. Sessions
 * are JWT (no database adapter): all we need from a sign-in is the verified
 * email, which the ownership map (a private Sanity dataset) then links to the
 * creator documents that email may edit. See docs/native-intake-brief.md.
 *
 * `auth()` is called directly in server components and actions — there is no
 * auth middleware, so the existing `proxy.ts` (the lowercase-path redirect)
 * is untouched. Under Next 16 `proxy.ts` runs in the Node runtime anyway, so
 * the old edge-compatibility constraints do not apply.
 *
 * Env: AUTH_SECRET (JWT signing) and AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET from
 * the Google OAuth client. Absent creds just mean sign-in is unavailable — the
 * Google Form fallback still is.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  session: { strategy: 'jwt' },
  // Trust the deployment host for callback URLs. Vercel is auto-detected; this
  // covers localhost and preview deployments explicitly.
  trustHost: true,
})
