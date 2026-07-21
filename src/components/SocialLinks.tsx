import { SocialIcon } from '@/components/social-icon'
import type { SocialLink } from '@/lib/types'

/**
 * A creator's social links, as icons.
 *
 * Each link is icon-only, so the accessible name has to come from the link
 * itself — an icon with no text and no label is an unlabelled link, which is
 * the most common way icon rows fail an audit.
 *
 * `title` is set as well as `aria-label`. Assistive tech ignores it when a
 * label is present, but it gives sighted users a tooltip for any mark they
 * do not recognise, which is most of them past the obvious three.
 */

/**
 * "Other" is a useless label to hear read aloud, so fall back to the
 * destination's hostname — "gumroad.com" says far more than "Other".
 */
function labelFor(platform: string, url: string): string {
  if (platform !== 'Other') return platform
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    // Sanity validates this field as a URL, so this is defensive only.
    return 'Website'
  }
}

export default function SocialLinks({ socials }: { socials?: SocialLink[] }) {
  if (!socials?.length) return null

  return (
    <ul className="flex flex-wrap items-center gap-1">
      {socials.map((social) => {
        const label = labelFor(social.platform, social.url)

        return (
          <li key={social.url}>
            <a
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              title={label}
              // size-10 rather than sizing to the icon: WCAG 2.5.8 wants a
              // 24px minimum target, and a 20px glyph with no padding is
              // under it — an awkward tap on a phone.
              className="text-muted-foreground hover:text-primary focus-visible:ring-ring flex size-10 items-center justify-center transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <SocialIcon platform={social.platform} />
            </a>
          </li>
        )
      })}
    </ul>
  )
}
