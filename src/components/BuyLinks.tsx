import { Button } from '@/components/ui/button'
import type { BuyLink } from '@/lib/types'

export default function BuyLinks({ links }: { links?: BuyLink[] | null }) {
  if (!links?.length) return null

  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) => (
        <Button key={link.url} variant="outline" size="sm" asChild>
          <a href={link.url} target="_blank" rel="noopener noreferrer">
            {link.store}
          </a>
        </Button>
      ))}
    </div>
  )
}
