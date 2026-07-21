import type { ReactNode } from 'react'

import { Separator } from '@/components/ui/separator'
import type { ComponentEntry } from './registry'
import { categoryLabels } from './registry'

/**
 * Shared wrapper for one component's documentation: name, import line, props
 * table, live preview.
 *
 * Server Component — the reference implementation wrapped previews in a
 * collapsible, which forced the whole page client-side. Nine components fit on
 * one page without it.
 */
export function PreviewPanel({
  entry,
  children,
}: {
  entry: ComponentEntry
  children?: ReactNode
}) {
  return (
    <section id={entry.id} className="scroll-mt-24 border-t pt-8">
      <div className="flex flex-wrap items-baseline gap-3">
        <h3 className="text-xl font-black tracking-tighter uppercase">{entry.name}</h3>
        <span className="text-muted-foreground text-[10px] tracking-widest uppercase">
          {categoryLabels[entry.category]}
        </span>
      </div>

      <p className="text-muted-foreground mt-2 max-w-2xl text-sm">{entry.description}</p>

      <code className="text-primary mt-3 block font-mono text-xs">
        import {'{'} {entry.name} {'}'} from &quot;{entry.importPath}&quot;
      </code>

      {entry.props.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-2xl border-collapse text-left text-sm">
            <thead>
              <tr className="text-muted-foreground text-[10px] tracking-widest uppercase">
                <th className="py-2 pr-4 font-normal">Prop</th>
                <th className="py-2 pr-4 font-normal">Type</th>
                <th className="py-2 pr-4 font-normal">Default</th>
                <th className="py-2 font-normal">Description</th>
              </tr>
            </thead>
            <tbody>
              {entry.props.map((prop) => (
                <tr key={prop.name} className="border-t align-top">
                  <td className="text-primary py-2 pr-4 font-mono text-xs whitespace-nowrap">
                    {prop.name}
                  </td>
                  <td className="text-muted-foreground py-2 pr-4 font-mono text-xs">{prop.type}</td>
                  <td className="text-muted-foreground py-2 pr-4 font-mono text-xs whitespace-nowrap">
                    {prop.default ?? '—'}
                  </td>
                  <td className="text-muted-foreground py-2 text-xs">{prop.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Separator className="my-6" />

      {children ? (
        <div className="bg-card overflow-x-auto border p-6">{children}</div>
      ) : (
        <p className="text-muted-foreground text-xs italic">
          No preview registered for “{entry.id}” in previews.tsx.
        </p>
      )}
    </section>
  )
}
