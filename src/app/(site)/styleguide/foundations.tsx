import { cn } from '@/lib/utils'

/**
 * Design tokens, rendered from the same values recorded in AGENTS.md §8.
 *
 * Ratios are stated, not computed at runtime — they were verified once and
 * written down so nobody re-derives them. If a value changes, recompute and
 * update both places.
 */

const colorTokens = [
  {
    token: '--background',
    value: '#030303',
    swatch: 'bg-background',
    use: 'All page and surface backgrounds. Not #000000.',
    ratio: '20.62:1 with white',
    status: 'pass',
  },
  {
    token: '--foreground',
    value: '#FFFFFF',
    swatch: 'bg-foreground',
    use: 'Body text on background.',
    ratio: '20.62:1',
    status: 'pass',
  },
  {
    token: '--primary',
    value: '#FF0095',
    swatch: 'bg-primary',
    use: 'Accent, links, CTAs.',
    ratio: '5.58:1 on background',
    status: 'pass',
  },
  {
    token: '--primary-foreground',
    value: '#000000',
    swatch: 'bg-primary-foreground',
    use: 'Text on primary surfaces. Black, not white.',
    ratio: '5.69:1 on primary',
    status: 'pass',
  },
  {
    token: '--muted-foreground',
    value: '#A1A1AA',
    swatch: 'bg-muted-foreground',
    use: 'De-emphasised text. zinc-400 is the floor.',
    ratio: '8.05:1 on background',
    status: 'pass',
  },
  {
    token: '--card',
    value: '#0A0A0A',
    swatch: 'bg-card',
    use: 'Raised surfaces.',
    ratio: '19.80:1 with white',
    status: 'pass',
  },
] as const

const rejected = [
  {
    pair: '#FFFFFF on #FF0095',
    ratio: '3.69:1',
    why: 'White text on a pink surface. The intuitive default, and it fails AA. Pink takes black.',
  },
  {
    pair: 'zinc-500 on #030303',
    ratio: '4.27:1',
    why: 'The reflexive choice for muted text, just under the line. Use zinc-400.',
  },
]

export function Foundations() {
  return (
    <section id="foundations" className="scroll-mt-24 border-t pt-8">
      <h3 className="text-xl font-black tracking-tighter uppercase">Foundations</h3>
      <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
        Every value is a CSS variable in globals.css exposed through Tailwind v4 <code>@theme</code>
        . Never hardcode these hex values or use raw Tailwind color classes in components.
      </p>

      <div className="mt-6 space-y-px">
        {colorTokens.map((t) => (
          <div key={t.token} className="bg-card flex flex-wrap items-center gap-4 border p-3">
            <div className={cn('size-12 shrink-0 border', t.swatch)} />
            <div className="min-w-40">
              <code className="text-primary font-mono text-xs">{t.token}</code>
              <p className="text-muted-foreground font-mono text-xs">{t.value}</p>
            </div>
            <p className="text-muted-foreground min-w-48 flex-1 text-xs">{t.use}</p>
            <p className="font-mono text-xs">{t.ratio}</p>
          </div>
        ))}
      </div>

      <h4 className="mt-8 text-xs font-black tracking-widest uppercase">
        Verified failures — do not use
      </h4>
      <div className="mt-3 space-y-px">
        {rejected.map((r) => (
          <div key={r.pair} className="border-destructive/40 bg-card border p-3">
            <div className="flex flex-wrap items-baseline gap-3">
              <code className="font-mono text-xs">{r.pair}</code>
              <span className="text-destructive font-mono text-xs">{r.ratio} — fails AA</span>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">{r.why}</p>
          </div>
        ))}
      </div>

      <h4 className="mt-8 text-xs font-black tracking-widest uppercase">Radius</h4>
      <p className="text-muted-foreground mt-2 text-xs">
        <code>--radius: 0px</code>. Square corners are the punk read. The theme block derives every
        other radius token from it, so there are no rounded corners to opt out of.
      </p>

      <h4 className="mt-8 text-xs font-black tracking-widest uppercase">Type</h4>
      <div className="mt-3 space-y-2">
        <p className="text-4xl font-black tracking-tighter uppercase">Page title — 4xl black</p>
        <p className="text-2xl font-black tracking-tighter uppercase">Section — 2xl black</p>
        <p className="text-base">Body — base regular</p>
        <p className="text-muted-foreground text-sm">Muted body — sm</p>
        <p className="text-muted-foreground text-[10px] tracking-widest uppercase">
          Eyebrow — 10px widest uppercase
        </p>
      </div>
    </section>
  )
}
