import type { SocialLink } from '@/lib/types'

export default function SocialLinks({ socials }: { socials?: SocialLink[] }) {
  if (!socials?.length) return null

  return (
    <div className="flex flex-wrap gap-3 text-sm">
      {socials.map((social) => (
        <a
          key={social.url}
          href={social.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          {social.platform}
        </a>
      ))}
    </div>
  )
}
