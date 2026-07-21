import { Section } from '@/components/ui/section'

export const dynamic = 'force-dynamic'

export default function MagazinePage() {
  return (
    <Section padding="md" maxWidth="3xl">
      <h1 className="text-3xl font-black tracking-tighter uppercase">ND Riot Magazine</h1>
      <p className="text-muted-foreground mt-4">
        The annual print magazine archive lives here. Add issues as a new Sanity type when
        you&apos;re ready (Phase 2) — for now this is a placeholder.
      </p>
    </Section>
  )
}
