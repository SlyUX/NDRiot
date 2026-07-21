<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:project-context (added by Claude, Cowork) -->

# Project: ND Riot

Indie-comics directory + editorial platform — the recruitment/marketing MVP for Stephen Fox's broader plan. Punk **hot-pink-on-near-black** aesthetic (`#FF0095` on `#030303`; superseded the original lime). Public directory of creators and books, plus editorial (columns + interviews), free downloads, and a magazine section. Reads from Sanity; content is the point.

## Stack
- Next.js 16.2.10 (App Router, Turbopack, `src/`, alias `@/*`), React 19.2, TypeScript, Tailwind v4
- Sanity v6 CMS, embedded Studio at `/studio` via `next-sanity`; GROQ in server components
- Vercel project `nd-riot` (team **Sly UX** / `sly-ux-5ae32f01`); push to `main` auto-deploys
- Live: https://ndriot.com (www → apex) and https://nd-riot.vercel.app

## Sanity
- **Project ID: `r9bvatt7`** · Dataset: `production` · API version: `2024-10-01`
- Owner login: **GitHub → fox@slyux.com** (org "Sly UX"). The `/studio` login IS the Sanity login — sign in with GitHub.
- Env vars in `.env.local` (mirrored in Vercel): `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `NEXT_PUBLIC_SANITY_API_VERSION`
- Document types (`src/sanity/schemaTypes`): `creator`, `book`, `column`, `interview`, `freeDownload`, `homepageFeature`
- Object types: `buyLink`, `socialLink`, `favoriteCreator`
- **CORS origins WITH "Allow credentials"**: `http://localhost:3000`, `http://localhost:3333`, `https://nd-riot.vercel.app`. Add new preview/deploy origins the same way or the Studio won't load.

## Routes (`src/app`)
- All public pages under the `(site)` route group (shared chrome in `(site)/layout.tsx`); root `layout.tsx` stays minimal so `/studio` is full-screen.
  - `/` · `/creators` · `/creators/[slug]` · `/books` · `/books/[slug]` · `/categories/[genre]` · `/editorial` · `/editorial/columns/[slug]` · `/editorial/interviews/[slug]` · `/downloads` · `/downloads/[slug]` · `/magazine`
- `/studio/[[...tool]]` — embedded Studio, OUTSIDE the `(site)` group.

## Gotchas / conventions
- `src/lib/queries.ts` → `safeFetch<T>()` MUST guard null: `const r = await client.fetch(...); return r ?? fallback`. This repo is where `FEATURES_QUERY` returned `null` and crashed `page.tsx` on `features.length` — GROQ returns `null`, not `[]`, when nothing matches. Always pass a fallback.
- `src/sanity/env.ts` THROWS on missing env (by design). "Missing NEXT_PUBLIC_SANITY_DATASET" = `.env.local` not loaded.
- Keep the `(site)` group intact so site chrome stays off the full-screen Studio.
- Public pages fetch server-side; only the browser Studio needs CORS.

## Local dev, git, deploy
- Node via **nvm** (`lts/*`). `npm run dev` → http://localhost:3000, Studio at `/studio`.
- Git remote is HTTPS with a **GitHub PAT** via `credential.helper osxkeychain`; run git in **Terminal.app**, not the VS Code git panel.
- Vercel env-var changes need a **manual redeploy**.

## Infrastructure / DNS (context; edit with care)
- `ndriot.com` registered at GoDaddy, **DNS managed at HostGator** (`ns7999/ns8000.hostgator.com`). Website records: `A @ → 216.150.1.1`, `CNAME www → <project>.vercel-dns-###.com`.
- **Do not touch** MX, `mail`, DKIM, or SPF records — email depends on them.

## Content status
- Old project (`nees0n70`, now orphaned) held only a placeholder "Stephen Fox" creator. Enter real creators, books, and editorial in `/studio`.

<!-- END:project-context -->

<!-- BEGIN:qa-standards -->

# Quality Assurance Standards

These are binding. If a request conflicts with one, say so before writing code — don't silently comply, and don't silently refuse either. Name the rule, give the cost, propose the alternative, then follow the user's call.

## 1. Verify APIs before writing them — never from memory

Next.js here is **16.2.10** and has breaking changes vs. training data. Tailwind is **v4** (CSS-first `@theme`, no `tailwind.config.js`). Sanity is **v6**.

- Next.js → read `node_modules/next/dist/docs/` first. Local docs beat any remote source.
- Tailwind v4 / Sanity v6 / shadcn — consult **Context7** (`resolve-library-id` → `query-docs`) before using an API you haven't verified this session. Configured in `.mcp.json`; needs `CONTEXT7_API_KEY` in the environment. If Context7 is unavailable, say so rather than guessing.
- Heed deprecation notices. A working build is not proof an API is current.

## 2. Content is Sanity's, not the code's

Assume **every string, image, label, and link a reader sees is CMS-managed** unless there's a stated reason otherwise.

- No hardcoded display copy in components — section headings, CTA labels, empty-state text, nav labels, and SEO metadata all come from Sanity.
- New UI that needs copy → the schema change ships **with** the component, not after.
- Components take content as props and stay presentational. Fetching happens in server components; cards and blocks never fetch.
- Legitimate exceptions: `aria-label`s, error boundaries, and dev-only text. Note the exception in a comment.
- Every field needs a Studio-side `title` and `description` — editors are the users of the schema.
- Images: always `urlFor()` with an explicit `width()`; always real `alt` text from Sanity (`asset->altText` or a sibling field), never the title as a fallback.

## 3. Reach for a variant before a new component

Before creating any component, check `src/components/` for something close. In order of preference:

1. Use the existing component as-is.
2. Add a **variant/prop** to it (CVA `variants`, a `layout` or `size` prop).
3. Compose existing components into a new one.
4. Only then, build new — and say in your response why 1–3 didn't work.

Watch for the failure mode this rule exists to prevent: `BookCard` and `CreatorCard` are the same component with different labels. Divergence like that is a bug, not a feature.

## 4. Component conventions

- **shadcn/ui + Radix + CVA** is the component foundation. Primitives live in `src/components/ui/` and are ours to edit — that's the point of shadcn. Composed/domain components live in `src/components/`.
- **Add primitives on demand, one at a time.** `npx shadcn@latest add <name>` when something actually imports it — never a speculative batch. Every unused primitive is code that gets read, reviewed, and maintained for nothing, and re-adding one takes seconds. If `src/components/ui/` grows a file nothing imports, delete it.
- Variants are declared with **CVA**, never with ad-hoc ternaries on `className`. Merge classes with `cn()` from `@/lib/utils` so consumer overrides win.
- Follow the composition pattern (`Card` → `CardHeader`/`CardTitle`/`CardContent`) rather than growing prop lists past ~7.
- Server Components by default. `'use client'` only for interactivity, and push it to the smallest leaf.

## 5. Porting from the reference styleguide

Components are ported from a styleguide Stephen authored for another org. He has permission to reuse it, but the two projects should not be visibly linked.

- **Strip all source-org identity.** No `UMC`, `umc`, `United Methodist`, `MyUMC`, `UMNews`, `ResourceUMC`, or `AskTheUMC` in component names, variant names, props, CSS classes, comments, copy, or file names. Rename to `NDRiot` / `ndRiot` / ND Riot, or to a neutral domain term where the ND Riot equivalent differs (`umc-blue` → a token, not a renamed brand color).
- Domain concepts translate, they don't transfer: `Topic` → genre, `ContentType` → book/column/interview, agency/church concepts → creator/publisher. Don't port a component whose domain has no ND Riot analogue.
- **Grep before every commit:** `grep -rniE "umc|united methodist" src/` must return nothing.
- Props were written for Contentful. Re-derive every shape from `src/sanity/schemaTypes` — never copy a Contentful-shaped interface.

## 6. TypeScript

- **No `any`.** Sanity query results get explicit types in `src/lib/types.ts` (or generated via `sanity typegen`), and the type must mirror what the GROQ projection actually returns.
- Optional Sanity fields are optional in the type. Studio data is always partially filled — render accordingly.

## 7. Data fetching

- All fetches go through `safeFetch<T>()` in `src/lib/queries.ts` with an explicit fallback. **GROQ returns `null`, not `[]`.** This has already broken production once.
- Queries are named exports colocated in `queries.ts`, not inlined in pages.
- Never assume a list is non-empty. Every collection view needs a real empty state.

## 8. Design tokens

Decided 2026-07-20. Every value below is a CSS variable in `src/app/globals.css` exposed via Tailwind v4 `@theme`. **Never hardcode these hex values or use raw Tailwind color classes** (`text-lime-400`, `bg-pink-500`) in components — go through the token.

| Token | Value | Use |
|---|---|---|
| `--background` | `#030303` | All page/surface backgrounds. Not `#000000`. |
| `--foreground` | `#FFFFFF` | Body text on background (20.62:1) |
| `--primary` | `#FF0095` | Accent, links, CTAs (5.58:1 on background) |
| `--primary-foreground` | `#000000` | Text/icons **on** primary surfaces (5.69:1) |
| `--muted-foreground` | `zinc-400` `#A1A1AA` | De-emphasized text (8.05:1) |
| `--radius` | `0px` | All radii. Square corners are the punk read — no `rounded-*` in components. |

**Verified contrast, do not re-derive:**
- `#FFFFFF` on `#FF0095` is **3.69:1 and fails AA.** White text on a pink surface is prohibited. Pink surfaces take `#000000`.
- `zinc-500` on `#030303` is **4.27:1 and fails AA.** `zinc-400` is the floor for muted text.
- `#FF0095` clears AA but not AAA. Fine for UI and accents; don't set long-form body copy in it.

## 9. Accessibility & semantics

- Semantic elements; one `<h1>` per page; heading levels don't skip.
- Interactive elements are `<button>` or `<a>`/`<Link>` — never a `div` with `onClick`.
- Visible focus states on everything focusable. Any **new** color pair must clear **WCAG AA (4.5:1)** for body text — compute it, don't eyeball it, then add it to the table in §8.
- Respect `prefers-reduced-motion` for any transition beyond a simple hover.

## 10. Before calling work done

- `npm run build` passes, and `npm run lint` is clean.
- Verify against real Studio content, including the empty and missing-image cases.
- Report honestly: if something is untested or partially done, say which part.

<!-- END:qa-standards -->
