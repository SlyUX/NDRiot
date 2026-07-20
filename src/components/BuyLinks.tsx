type BuyLink = { store: string; url: string }
export default function BuyLinks({ links }: { links?: BuyLink[] }) {
  if (!links?.length) return null
  return (
    <div className="flex flex-wrap gap-2">
      {links.map((l) => (
        <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer"
          className="rounded border border-white/20 px-3 py-1.5 text-sm font-bold uppercase tracking-wide hover:bg-white hover:text-black transition">
          {l.store}
        </a>
      ))}
    </div>
  )
}
