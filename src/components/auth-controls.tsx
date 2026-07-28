import { signIn, signOut } from '@/auth'
import { Button } from '@/components/ui/button'

/**
 * Sign-in / sign-out controls for the intake flow.
 *
 * Server components wrapping Auth.js's `signIn` / `signOut` in tiny inline
 * Server Actions, so they submit as plain forms and work without client JS.
 * Both return to /join, where the flow lives. Labels are passed in from Sanity
 * (§2).
 */

export function SignInButton({ label }: { label: string }) {
  return (
    <form
      action={async () => {
        'use server'
        await signIn('google', { redirectTo: '/join' })
      }}
    >
      <Button type="submit" size="lg" className="font-black tracking-wide uppercase">
        {label}
      </Button>
    </form>
  )
}

export function SignOutButton({ label }: { label: string }) {
  return (
    <form
      action={async () => {
        'use server'
        await signOut({ redirectTo: '/join' })
      }}
    >
      <button
        type="submit"
        className="text-muted-foreground hover:text-primary focus-visible:ring-ring text-xs tracking-widest uppercase underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-none"
      >
        {label}
      </button>
    </form>
  )
}
