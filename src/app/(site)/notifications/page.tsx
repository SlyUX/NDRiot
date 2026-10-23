import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { SignInButton } from '@/components/auth-controls'
import { UpdateFeed } from '@/components/update-feed'
import { Section } from '@/components/ui/section'
import { auth } from '@/auth'
import { newNotifications } from '@/lib/notifications'
import { getSiteSettings } from '@/lib/site-settings'
import { markNotificationsSeen } from '@/sanity/reader-prefs-client'

/**
 * The signed-in reader's notifications — new activity from who/what they follow,
 * plus new strips if they subscribed (§3: explicit follows only, never
 * inferred). Private: never indexed. Opening the page acknowledges it, so the
 * nav badge clears for next time.
 */
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  return {
    title: `${settings.sections.notificationsTitle} · ${settings.siteTitle}`,
    robots: { index: false, follow: false },
  }
}

export default async function NotificationsPage() {
  const [settings, session] = await Promise.all([getSiteSettings(), auth()])
  const s = settings.sections
  const email = session?.user?.email

  // Signed out: a plain invitation, matching /me.
  if (!email) {
    return (
      <Section padding="md" maxWidth="3xl">
        <h1 className="text-3xl font-black tracking-tighter uppercase">{s.notificationsTitle}</h1>
        <p className="text-muted-foreground mt-3 max-w-prose text-sm">{s.accountSignInBody}</p>
        <div className="mt-6">
          <SignInButton label={s.accountSignInCta} redirectTo="/notifications" />
        </div>
      </Section>
    )
  }

  const { updates, newStrips } = await newNotifications(email, s.conventionFeedBody)
  // Viewing is acknowledging — reset the "new since" marker so the badge clears.
  await markNotificationsSeen(email)

  const empty = updates.length === 0 && !newStrips

  return (
    <Section padding="md" maxWidth="3xl">
      <h1 className="text-3xl font-black tracking-tighter uppercase">{s.notificationsTitle}</h1>

      {empty ? (
        // An empty inbox is a discovery moment, not a dead end (§3).
        <div className="mt-6 max-w-prose">
          <p className="text-muted-foreground text-sm">{s.notificationsEmpty}</p>
          <Link
            href="/comics"
            className="text-primary hover:text-primary focus-visible:ring-ring mt-4 inline-block text-sm font-black tracking-widest uppercase hover:underline focus-visible:ring-2 focus-visible:outline-none"
          >
            {settings.home.viewAllLabel} →
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {newStrips && (
            <Link
              href="/comics?tab=strips"
              className="bg-card hover:text-primary focus-visible:ring-ring flex items-center justify-between gap-3 px-4 py-3 text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <span>{s.notificationsNewStripsLabel}</span>
              <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
            </Link>
          )}
          {updates.length > 0 && <UpdateFeed updates={updates} emptyLabel={s.accountFeedEmpty} />}
        </div>
      )}
    </Section>
  )
}
