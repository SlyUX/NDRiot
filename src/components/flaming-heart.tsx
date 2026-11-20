import { cn } from "@/lib/utils";

/**
 * Flaming heart — the "Fave" mark (AGENTS.md §3: the reader's one explicit
 * signal). A hand-authored glyph, rendered in `currentColor` so a parent sets
 * the color — brand pink when active/faved, otherwise the inherited text color.
 * Sized by the consumer via `className` (e.g. `size-4`); the 51×63 artwork keeps
 * its aspect ratio. Decorative — the wrapping button/link carries the label.
 */
export function FlamingHeart({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 51 63"
      fill="currentColor"
      aria-hidden="true"
      className={cn("size-4", className)}
    >
      <path d="M25.5,61.7c-.4,0-.7-.1-1.1-.3C-1.5,44.7,3.5,32.7,4.3,31c.5-1.1,3.5-7.5,11.1-7.5s8.2,1.8,10,2.9c1.8-1.1,5.3-2.9,10-2.9,7.6,0,10.7,6.5,11.1,7.5.8,1.6,5.9,13.7-20.1,30.3-.3.2-.7.3-1.1.3ZM15.5,27.5c-5.4,0-7.4,4.9-7.5,5.1,0,.1,0,.2-.1.3,0,0-4.9,9.6,17.7,24.4,22.5-14.8,17.7-24.3,17.6-24.4,0,0,0-.2-.1-.2h0c0-.2-2.2-5.1-7.5-5.1s-8.7,2.9-8.7,2.9c-.8.6-1.9.6-2.6,0,0,0-3.5-2.9-8.7-2.9ZM41.6,23.2c.8-.2,1.3-1,1.1-1.8,0-.2-1.4-5.6-8.4-8.9-2.3-1.1-3.8-2.4-4.2-4.1-.7-2.4.8-4.7.9-4.7.3-.5.3-1.2,0-1.7-.4-.5-1-.7-1.6-.6-3.2.8-5.6,2.4-7,4.7-1.9,3.2-1.2,6.8-1.1,7.5,0,.6,0,2.1-.7,2.9-.5.5-1.2.8-2.2.8s-1.4-.4-1.5-.5c-.7-.9-.2-3.1.1-4,.2-.6,0-1.2-.4-1.6-.4-.4-1-.5-1.6-.3-5.8,2.2-6.9,8.1-6.8,10.9,0,.8.8,1.5,1.6,1.4.8,0,1.5-.8,1.4-1.6,0-.2-.2-3.8,2.3-6.2,0,1.1.2,2.2.9,3.2.6.8,1.8,1.8,4,1.8s3.8-1,4.5-1.8c1.8-2.1,1.5-5,1.4-5.4,0,0,0-.1,0-.2,0,0-.7-2.9.7-5.4.5-.8,1.2-1.5,2.1-2.1-.2,1.1-.3,2.4.1,3.7.7,2.5,2.7,4.5,5.9,6,5.6,2.6,6.7,6.7,6.8,6.8.2.7.8,1.2,1.5,1.2s.2,0,.3,0Z" />
    </svg>
  );
}
