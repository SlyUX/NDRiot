import { cn } from '@/lib/utils'

/**
 * The mobile menu button: ND Riot's "+" mark that rotates 45° into an "×" when
 * the menu is open. One glyph, two states — collapsed reads "add / more",
 * expanded reads "close".
 *
 * The label is the accessible name (the glyph itself is decorative), and the
 * rotation respects prefers-reduced-motion.
 */
export function MenuTrigger({
  open,
  onClick,
  controls,
  label,
}: {
  open: boolean
  onClick: () => void
  /** id of the panel this button controls, for aria-controls. */
  controls: string
  /** Accessible name — changes with state so it says what the press will do. */
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-expanded={open}
      aria-controls={controls}
      className="focus-visible:ring-ring -mr-2 inline-flex size-11 items-center justify-center focus-visible:ring-2 focus-visible:outline-none md:hidden"
    >
      {/* Decorative — the button's aria-label names it. Plain <img>: it is a
          local SVG, and Next's optimizer refuses SVG anyway. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/nd-riot-menu-trigger.svg"
        alt=""
        aria-hidden="true"
        className={cn(
          'size-6 transition-transform duration-200 ease-out motion-reduce:transition-none',
          open && 'rotate-45',
        )}
      />
    </button>
  )
}
