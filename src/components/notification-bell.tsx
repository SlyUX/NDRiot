import Link from 'next/link'
import { Bell } from 'lucide-react'

/**
 * The nav notification bell — a count badge over a link to /notifications.
 *
 * Presentational and server-rendered: the count is computed per request in the
 * layout, so there's no client state here. The badge is pink with black text
 * (--primary / --primary-foreground; white fails AA on pink) and square, per
 * the design tokens (§9). Shown only to signed-in readers.
 */
export function NotificationBell({
  count,
  label,
  href = '/notifications',
}: {
  count: number
  label: string
  href?: string
}) {
  return (
    <Link
      href={href}
      aria-label={count > 0 ? `${label} (${count})` : label}
      className="text-foreground/80 hover:text-primary focus-visible:ring-ring relative transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <Bell aria-hidden="true" className="size-5" />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="bg-primary text-primary-foreground absolute -top-2 -right-2 flex min-w-4 items-center justify-center px-1 text-[10px] font-black tabular-nums"
        >
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  )
}
