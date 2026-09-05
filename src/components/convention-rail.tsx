import Link from "next/link";

/**
 * One block of the convention page's right rail — a heading over a compact list
 * of linked conventions (name + a meta line), styled like the home hero's feed
 * rail. Used for "Other cons in {state}" and "Upcoming cons". Renders nothing
 * when it has no items, so an empty block never leaves a stray heading.
 */
export interface ConventionRailItem {
  slug: string;
  name: string;
  meta: string;
}

export function ConventionRail({
  heading,
  items,
}: {
  heading: string;
  items: ConventionRailItem[];
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-primary text-xs leading-tight font-black tracking-[0.2em] uppercase">
          {heading}
        </h2>
        <span className="bg-border h-px flex-1" aria-hidden="true" />
      </div>
      <ul className="space-y-4">
        {items.map((item) => (
          <li key={item.slug}>
            <Link
              href={`/conventions/${item.slug}`}
              className="group focus-visible:ring-ring block focus-visible:ring-2 focus-visible:outline-none"
            >
              <p className="group-hover:text-primary text-sm leading-snug font-bold transition-colors">
                {item.name}
              </p>
              {item.meta && (
                <p className="text-muted-foreground mt-0.5 text-xs tracking-wide uppercase">
                  {item.meta}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
