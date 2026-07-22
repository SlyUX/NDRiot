import type { Metadata } from 'next'

import { Section } from '@/components/ui/section'

import { Foundations } from './foundations'
import { PreviewPanel } from './preview-panel'
import { previews } from './previews'
import { categoryLabels, componentEntries, type ComponentCategory } from './registry'

/**
 * Internal component reference. AGENTS.md §2 exception: this documents the
 * code, so its copy lives in the code rather than in Sanity.
 */
export const metadata: Metadata = {
  title: 'Styleguide · ND Riot',
  description: 'Component and design token reference.',
  // Internal tooling — keep it out of search results.
  robots: { index: false, follow: false },
}

const ORDER: ComponentCategory[] = ['primitives', 'composed']

export default function StyleguidePage() {
  return (
    <Section padding="md" innerClassName="space-y-12">
      <header>
        <h1 className="text-4xl font-black tracking-tighter uppercase">Styleguide</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          Every component in the system, with its real props and a live preview. Before building
          anything new, check here for something to reuse or extend — see AGENTS.md §4.
        </p>
        <nav aria-label="Styleguide sections" className="mt-6 flex flex-wrap gap-x-4 gap-y-2">
          <a href="#foundations" className="text-primary text-xs uppercase hover:underline">
            Foundations
          </a>
          {componentEntries.map((entry) => (
            <a
              key={entry.id}
              href={`#${entry.id}`}
              className="text-primary text-xs uppercase hover:underline"
            >
              {entry.name}
            </a>
          ))}
        </nav>
      </header>

      <Foundations />

      {ORDER.map((category) => {
        const entries = componentEntries.filter((entry) => entry.category === category)
        if (entries.length === 0) return null

        return (
          <div key={category} className="space-y-12">
            <h2 className="text-muted-foreground text-xs font-black tracking-widest uppercase">
              {categoryLabels[category]}
            </h2>
            {entries.map((entry) => (
              <PreviewPanel key={entry.id} entry={entry}>
                {previews[entry.id]}
              </PreviewPanel>
            ))}
          </div>
        )
      })}
    </Section>
  )
}
