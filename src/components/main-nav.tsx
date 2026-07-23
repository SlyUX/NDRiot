'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'

import { MenuTrigger } from '@/components/menu-trigger'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu'
import { groupLinks, isPanel } from '@/lib/nav'
import type { NavItem, NavPanel } from '@/lib/site-settings'
import { cn } from '@/lib/utils'

/**
 * The header navigation, driven entirely by siteSettings.nav.
 *
 * Two presentations of one data structure: a Radix mega-menu on desktop, an
 * expandable drawer on mobile. A nav item is either a plain link (Join) or a
 * panel that opens a menu of grouped links (Browse, Editorial). Genre groups
 * fill from the taxonomy — see lib/nav.
 */

const LINK = 'block px-3 py-1.5 text-sm text-foreground/80 hover:text-primary transition-colors'
const HEADING = 'text-muted-foreground mb-2 px-3 text-[10px] font-bold tracking-widest uppercase'

/** Desktop dropdown contents: each group a column; a long group (genres) wraps. */
function DesktopPanel({ panel }: { panel: NavPanel }) {
  return (
    <div className="p-5">
      {/* The trigger opens the menu rather than navigating, so the panel's own
          landing page needs a link of its own. */}
      {panel.href && (
        <NavigationMenuLink asChild>
          <Link
            href={panel.href}
            className="text-primary mb-3 block px-3 text-xs font-bold tracking-widest uppercase hover:underline"
          >
            All {panel.label}
          </Link>
        </NavigationMenuLink>
      )}
      <div className="flex gap-8">
      {panel.groups?.map((group, i) => {
        const links = groupLinks(group)
        const many = links.length > 8
        return (
          <div key={group.heading ?? i} className={cn(many && 'min-w-[20rem]')}>
            {group.heading && <p className={HEADING}>{group.heading}</p>}
            <ul className={cn(many && 'columns-2 gap-x-4')}>
              {links.map((link) => (
                <li key={link.href} className="break-inside-avoid">
                  <NavigationMenuLink asChild>
                    <Link href={link.href} className={LINK}>
                      {link.label}
                    </Link>
                  </NavigationMenuLink>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
      </div>
    </div>
  )
}

function DesktopNav({ nav }: { nav: NavItem[] }) {
  return (
    <NavigationMenu viewport={false} className="hidden md:flex">
      <NavigationMenuList className="gap-1">
        {nav.map((item) =>
          isPanel(item) ? (
            <NavigationMenuItem key={item.label}>
              <NavigationMenuTrigger className="bg-transparent text-sm font-bold tracking-wide text-foreground/80 uppercase hover:bg-transparent hover:text-primary data-[state=open]:bg-transparent data-[state=open]:text-primary">
                {item.label}
              </NavigationMenuTrigger>
              {/* Square, #030303, pink hairline. The primitive styles the
                  panel as a rounded raised popover via a higher-specificity
                  group-data variant, so these need `!` to win — square corners
                  and the --background surface are both §9 rules.

                  z-50: the viewport=false content carries NO z-index of its own
                  (that lives on the unused viewport), so without this the panel
                  paints behind the page.

                  right-0/left-auto: anchor the panel to the trigger's right
                  edge so a wide menu opens leftward and never runs off-screen. */}
              <NavigationMenuContent className="!rounded-none !bg-background !ring-0 border-primary/40 z-50 right-0 left-auto border">
                <DesktopPanel panel={item} />
              </NavigationMenuContent>
            </NavigationMenuItem>
          ) : (
            <NavigationMenuItem key={item.href}>
              <NavigationMenuLink asChild>
                <Link
                  href={item.href}
                  className="text-foreground/80 hover:text-primary inline-flex h-9 items-center px-3 text-sm font-bold tracking-wide uppercase transition-colors"
                >
                  {item.label}
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          ),
        )}
      </NavigationMenuList>
    </NavigationMenu>
  )
}

function MobileNav({ nav }: { nav: NavItem[] }) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <div className="md:hidden">
      <MenuTrigger
        open={open}
        onClick={() => setOpen((o) => !o)}
        controls="mobile-menu"
        label={open ? 'Close menu' : 'Open menu'}
      />

      {/* Sits under the header bar. hidden (not unmounted) keeps it in the DOM
          and crawlable. Native <details> gives accessible per-panel accordions
          without extra state. */}
      <div
        id="mobile-menu"
        hidden={!open}
        className="border-primary/40 bg-background absolute inset-x-0 top-full z-50 border-b"
      >
        <nav className="mx-auto max-w-[90rem] px-6 py-3">
          {nav.map((item) =>
            isPanel(item) ? (
              <details key={item.label} className="group border-white/10 border-b last:border-0">
                <summary className="text-foreground flex cursor-pointer list-none items-center justify-between py-3 text-sm font-bold tracking-wide uppercase">
                  {item.label}
                  <ChevronDown
                    aria-hidden="true"
                    className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                  />
                </summary>
                <div className="space-y-3 pb-3">
                  {item.href && (
                    <Link
                      href={item.href}
                      onClick={close}
                      className="text-primary block px-3 py-1.5 text-sm font-bold hover:underline"
                    >
                      All {item.label}
                    </Link>
                  )}
                  {item.groups?.map((group, i) => (
                    <div key={group.heading ?? i}>
                      {group.heading && <p className={HEADING}>{group.heading}</p>}
                      <ul className="grid grid-cols-2 gap-x-4">
                        {groupLinks(group).map((link) => (
                          <li key={link.href}>
                            <Link href={link.href} onClick={close} className={LINK}>
                              {link.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </details>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className="text-foreground hover:text-primary block border-b border-white/10 py-3 text-sm font-bold tracking-wide uppercase transition-colors last:border-0"
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>
      </div>
    </div>
  )
}

export function MainNav({ nav }: { nav: NavItem[] }) {
  return (
    <>
      <DesktopNav nav={nav} />
      <MobileNav nav={nav} />
    </>
  )
}
