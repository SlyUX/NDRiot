# ND Riot — scaffold setup

Next.js 16 + Sanity 6. Indie comics directory & discovery. Same flow you just did for Fox Storytelling.

## 1. Install
```bash
npm install
```

## 2. Create a SEPARATE Sanity project (not Fox's)
- https://www.sanity.io/manage → **Create project** → name "ND Riot", dataset `production`, public read.
- Copy the **Project ID**. Under API → **CORS origins**, add `http://localhost:3000` **with credentials** (Studio needs it — the one thing we got wrong the first time).
```bash
cp .env.local.example .env.local
# set NEXT_PUBLIC_SANITY_PROJECT_ID to the NEW ND Riot project id
```

## 3. Run
```bash
npm run dev
```
- Site: http://localhost:3000  ·  Studio: http://localhost:3000/studio
- In the Studio, add a **Creator** first (books/columns/interviews reference creators), then a **Book**. They appear on the site immediately.
- Remember: click **Publish** (green) — drafts don't show on the site.

## 4. Ship
```bash
git add -A && git commit -m "feat: ND Riot Next.js + Sanity scaffold" && git push
```
Vercel → Add New → Project → import **SlyUX/NDRiot** → add the three `NEXT_PUBLIC_SANITY_*` env vars (the ND Riot ones) → Deploy. Add your `.vercel.app` URL to Sanity CORS (with credentials) to use the live Studio.

## 5. Domain (later)
ND Riot's domain is at **GoDaddy** with email on **Bluehost**. When ready: in GoDaddy DNS, point the site records at Vercel (A `@` → Vercel IP, CNAME `www` → `cname.vercel-dns.com.`) and **leave the MX records alone** so Bluehost email keeps working.

## Content model (6 types)
`creator` · `book` · `column` · `interview` · `freeDownload` · `homepageFeature`
+ objects: `buyLink`, `socialLink`, `favoriteCreator`

## Routes
`/` · `/creators` · `/creators/[slug]` · `/books` · `/books/[slug]` · `/categories/[genre]` · `/editorial` (+ `/columns/[slug]`, `/interviews/[slug]`) · `/downloads` (+ `/[slug]`) · `/magazine` · `/studio`

## The move right now: recruit with a vertical slice
You don't need the whole directory to start recruiting. Add **yourself + 1–2 creators + a book or two**, deploy, and use *that live taste* to invite creators from your CRM. Build the rest as they join. Drop your v0/Figma punk design onto these routes to replace the placeholder styling.
