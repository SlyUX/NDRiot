import { Section } from "@/components/ui/section";

/**
 * Shown while a /me view loads (incl. switching views via the user nav). A quiet
 * skeleton of the Bunker header + a content block — app-appropriate feedback, not
 * a spinner/gif. Pulse is disabled under prefers-reduced-motion (§10).
 */
export default function MeLoading() {
  return (
    <Section padding="md" maxWidth="3xl">
      <div
        aria-hidden="true"
        className="animate-pulse space-y-6 motion-reduce:animate-none"
      >
        <div className="flex items-center gap-4">
          <div className="bg-muted size-24 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="bg-muted h-7 w-48 max-w-full" />
            <div className="bg-muted h-4 w-32 max-w-full" />
            <div className="bg-muted h-4 w-40 max-w-full" />
          </div>
        </div>
        <div className="bg-muted h-10 w-full" />
        <div className="bg-muted h-48 w-full" />
      </div>
      <span className="sr-only">Loading…</span>
    </Section>
  );
}
