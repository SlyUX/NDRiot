import PortableTextBody from '@/components/PortableTextBody'
import type { HubCopy } from '@/lib/types'

/**
 * A genre/format hub's intro line: the editor's rich-text intro when one is
 * written, otherwise the generated fallback string. Either way, a real
 * sentence sits above the neutral list of comics.
 */
export function HubIntro({
  intro,
  fallback,
}: {
  intro: NonNullable<HubCopy>['intro'] | null | undefined
  fallback: string
}) {
  if (intro && intro.length > 0) {
    return (
      <div className="text-muted-foreground mt-3 max-w-prose text-sm">
        <PortableTextBody value={intro} />
      </div>
    )
  }
  return <p className="text-muted-foreground mt-3 max-w-prose text-sm">{fallback}</p>
}
