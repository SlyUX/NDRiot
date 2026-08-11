'use client'

import { usePathname } from 'next/navigation'

import { startSignIn } from '@/app/actions/saves'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

/**
 * "Sign in to continue" modal — the gate for any reader action that needs an
 * account (Save, for now). It explains the feature and offers Google sign-in.
 *
 * Note: Google forbids framing its login page, so the button launches the real
 * OAuth flow (a full-page hop to Google and back to `returnTo`) rather than
 * embedding it. Copy comes from Sanity (§2).
 */
export function SignInDialog({
  open,
  onOpenChange,
  title,
  body,
  cta,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  body: string
  cta: string
}) {
  const pathname = usePathname()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{body}</DialogDescription>
        <form action={startSignIn.bind(null, pathname)}>
          <Button type="submit" size="lg" className="w-full font-black tracking-wide uppercase">
            {cta}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
