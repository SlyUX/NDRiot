import { signIn, signOut } from '@/auth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Sign-in / sign-out controls for the intake flow.
 *
 * Server components wrapping Auth.js's `signIn` / `signOut` in tiny inline
 * Server Actions, so they submit as plain forms and work without client JS.
 * `redirectTo` returns to the form that rendered the control (creator, book,
 * media). Labels are passed in from Sanity (§2).
 */

export function SignInButton({ label, redirectTo = '/join' }: { label: string; redirectTo?: string }) {
  return (
    <form
      action={async () => {
        'use server'
        await signIn('google', { redirectTo })
      }}
    >
      <Button type="submit" size="lg" className="font-black tracking-wide uppercase">
        {label}
      </Button>
    </form>
  )
}

export function SignOutButton({
  label,
  redirectTo = '/join',
  className,
}: {
  label: string
  redirectTo?: string
  /** Override the link color — e.g. white on the creator section's pink. */
  className?: string
}) {
  return (
    <form
      action={async () => {
        'use server'
        await signOut({ redirectTo })
      }}
    >
      <button
        type="submit"
        className={cn(
          'text-muted-foreground hover:text-primary focus-visible:ring-ring text-xs tracking-widest uppercase underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-none',
          className,
        )}
      >
        {label}
      </button>
    </form>
  )
}
