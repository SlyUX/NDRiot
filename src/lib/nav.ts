import { GENRES } from '@/lib/taxonomy'
import type { NavGroup, NavItem, NavLink, NavPanel } from '@/lib/site-settings'

/**
 * The links a nav group actually renders.
 *
 * A group flagged `useGenres` is filled from the code taxonomy rather than
 * from hand-entered links — genres are a fixed list with their own category
 * pages, so listing them in the CMS would only invite drift. Every other group
 * uses its editor-entered links. The genre href matches GenreBadge exactly, so
 * both land on the same /categories page.
 *
 * `genres` narrows the list to categories a book actually uses (see
 * genreOptions in lib/filters) — Browse should not offer a genre whose page is
 * empty. Falls back to the full taxonomy when the caller has no live list.
 */
export function groupLinks(group: NavGroup, genres?: readonly string[]): NavLink[] {
  if (group.useGenres) {
    return (genres ?? GENRES).map((genre) => ({
      label: genre,
      href: `/categories/${encodeURIComponent(genre)}`,
    }))
  }
  return group.links ?? []
}

/** Narrowing helper — a panel has groups, a plain link does not. */
export function isPanel(item: NavItem): item is NavPanel {
  return item._type === 'navPanel'
}
