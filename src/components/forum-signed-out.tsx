import { SignInButton } from '@/components/auth-controls'
import { Section } from '@/components/ui/section'
import type { ForumSettings } from '@/lib/site-settings'

/**
 * The forum's signed-out / not-a-creator invitation. A soft wall, not a 404 —
 * the forum is roster-gated, so a visitor who isn't a creator is told how to get
 * in rather than shown content. Copy from Sanity (§2).
 */
export function ForumSignedOut({ copy }: { copy: ForumSettings }) {
  return (
    <Section padding="md" maxWidth="3xl">
      <h1 className="text-3xl font-black tracking-tighter uppercase">
        {copy.signedOutHeading}
      </h1>
      <p className="text-muted-foreground mt-3 max-w-prose text-sm">{copy.signedOutBody}</p>
      <div className="mt-6">
        <SignInButton label="Sign in" redirectTo="/forum" />
      </div>
    </Section>
  )
}
