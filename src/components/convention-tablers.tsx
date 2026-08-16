import Image from "next/image";
import Link from "next/link";

import { SectionHeading } from "@/components/section-heading";
import { isUpcomingDate } from "@/lib/conventions";
import { urlFor } from "@/sanity/image";
import type { ConventionTabler } from "@/lib/types";

/**
 * "Creators with tables" on a convention page — everyone tabling at the current
 * occurrence, alphabetical (neutral order, never rank-like — §3). A marker for a
 * past occurrence auto-expires (isUpcomingDate), so this only ever lists the
 * upcoming show. Renders nothing when empty.
 */
export function ConventionTablers({
  tablers,
  heading,
  tableLabel,
}: {
  tablers: ConventionTabler[];
  heading: string;
  tableLabel: string;
}) {
  const active = tablers.filter((tabler) => isUpcomingDate(tabler.forDate));
  if (active.length === 0) return null;

  return (
    <section>
      <SectionHeading as="h2" size="sm">
        {heading}
      </SectionHeading>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-4">
        {active.map((tabler) => (
          <li key={tabler._id}>
            <Link
              href={`/creators/${tabler.slug}`}
              className="focus-visible:ring-ring group flex items-center gap-3 focus-visible:ring-2 focus-visible:outline-none"
            >
              <div className="bg-muted relative aspect-square w-11 shrink-0 overflow-hidden">
                {tabler.photo && (
                  <Image
                    src={urlFor(tabler.photo).width(88).height(88).url()}
                    alt=""
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="group-hover:text-primary truncate text-sm font-bold transition-colors">
                  {tabler.name}
                </p>
                {tabler.tableNumber && (
                  <p className="text-muted-foreground text-xs">
                    {tableLabel} {tabler.tableNumber}
                  </p>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
