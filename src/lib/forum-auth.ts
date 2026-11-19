import 'server-only'

import { auth } from '@/auth'
import { isAdminEmail } from '@/lib/admin'
import { creatorsOwnedBy } from '@/sanity/ownership-client'

export type ForumUser = { id: string; email: string; isAdmin: boolean }

/**
 * The forum's roster gate for server components. Returns the signed-in creator
 * (identity + admin flag) or null when the viewer isn't a creator — the page
 * then shows the signed-out invitation instead of any forum content. Mirrors the
 * `me()` gate in the forum server actions; kept out of the "use server" actions
 * file so it can be imported by pages.
 */
export async function resolveForumUser(): Promise<ForumUser | null> {
  const session = await auth()
  const email = session?.user?.email?.trim()
  if (!email) return null
  const id = (await creatorsOwnedBy(email))[0]
  if (!id) return null
  return { id, email, isAdmin: isAdminEmail(email) }
}
