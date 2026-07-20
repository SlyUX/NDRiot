import Link from 'next/link'
const nav = [
  ['Creators', '/creators'], ['Books', '/books'], ['Editorial', '/editorial'],
  ['Downloads', '/downloads'], ['Magazine', '/magazine'],
]
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-lime-400/40">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <Link href="/" className="text-xl font-black uppercase tracking-tighter">ND<span className="text-lime-400">Riot</span></Link>
          <div className="flex flex-wrap gap-5 text-sm font-bold uppercase tracking-wide">
            {nav.map(([label, href]) => (
              <Link key={href} href={href} className="text-neutral-300 hover:text-lime-400">{label}</Link>
            ))}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      <footer className="border-t border-lime-400/40 py-8 text-center text-xs uppercase tracking-widest text-neutral-500">
        Support indie comics. · ND Riot
      </footer>
    </>
  )
}
