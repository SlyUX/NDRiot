type Social = { platform: string; url: string }
export default function SocialLinks({ socials }: { socials?: Social[] }) {
  if (!socials?.length) return null
  return (
    <div className="flex flex-wrap gap-3 text-sm">
      {socials.map((s) => (
        <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="text-lime-400 hover:underline">
          {s.platform}
        </a>
      ))}
    </div>
  )
}
