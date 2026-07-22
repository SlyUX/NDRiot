# Brief: ND Riot book intake form

Companion to `creator-intake-form-brief.md`. Same conventions: follow it
literally, the option lists are copied from `src/lib/taxonomy.ts`, and the
reasoning is given where a question looks odd.

**A creator must exist in the CMS before their books can be added.** The
importer refuses a book whose creator it cannot find rather than guessing, so
the creator form always comes first.

---

## Two ways in, one importer

**The form** is for books published from now on — one submission per book.

**A spreadsheet** is for back catalogues, and is not a fallback. Joseph
Christy's first submission listed fifteen titles in a single answer; nobody
fills a form fifteen times. A sheet with these exact column names imports
identically:

    Title · Creator · Preferred web address · Format · Genres ·
    Who is it for? · Publication status · Short description ·
    Full description · Cover image · Describe the cover · Where to buy ·
    Kickstarter link · Can we publish this?

Then: `node scripts/import-books.mjs data/<file>.csv`

## Settings

- **Title:** Add a comic to ND Riot
- **Description:** *One form per book. If you have a back catalogue, tell us and we'll send a spreadsheet instead — nobody should fill this in fifteen times.*
- Collect email addresses: **on**
- Limit to 1 response: **off**
- Confirmation: *Got it. We'll be in touch before it goes live.*

---

## Section 1 — What it is

**1. Title** · Short answer · **Required**
Help text: *Exactly as it appears on the cover, including any subtitle.*

**2. Creator** · Dropdown · **Required**
Options: every creator currently in the CMS.
Help text: *Not listed? Fill in the creator form first — we can't add a book without them.*

> **Matched on name or slug, never on email.** Every published Sanity document
> is readable without authentication, so an email stored on a creator record is
> an email published to anyone who runs a GROQ query. The importer never writes
> one.
>
> The slug is the identifier that is already unique *and* already public — it
> is in the URL. In a hand-filled spreadsheet, put the slug (`joseph-christy`)
> in the Creator column rather than the name: two people can share a name,
> nobody shares a slug. The importer accepts either, prefers the slug, and
> refuses a name that matches more than one creator rather than attributing
> someone's book to a stranger.

> **Maintenance:** this list has to track the Creator documents. It is the same
> hand-maintained-until-it-hurts arrangement as the organisations list on the
> creator form, and the same trigger applies: when updating it becomes a chore,
> build the sync described in `content-intake.md`.

**3. Preferred web address** · Short answer · Optional
Help text: *It'll live at ndriot.com/books/your-title. Leave blank and we'll build it from the title.*

---

## Section 2 — Classification

Three separate questions on purpose. They answer different things, and folding
them together is what the site's taxonomy split exists to prevent: a book is a
horror zine for adults — genre, format and audience all at once.

**4. Format** · Multiple choice · Optional
```
Graphic Novel — a complete standalone story in one volume
Single Issue — one instalment of a series, also called a floppy
Collected Edition — several issues bound together, a trade paperback
Anthology — a collection of short works, usually by several creators
Minicomic — small-format, short-run, usually handmade
Zine — self-published and often handmade, photocopier energy
Webcomic — screen-native, no fixed page count, published online
```

**5. Genres** · Checkboxes · Optional · *Allow "Other"* · **Limit to 3**
```
Action & Adventure
Sci-Fi
Fantasy
Horror
Crime & Noir
Romance
Drama
Slice of Life
Historical
Superhero
Humor & Satire
Memoir & Autobio
Queer
Weird & Experimental
Punk & Protest
```
Help text: *Up to three. Not listed? Use Other — we'd rather add a genre than squeeze you into the wrong one.*

**6. Who is it for?** · Multiple choice · Optional
```
All Ages — suitable for everyone, cartoon violence at most
Teen — 13+, mild violence and language, suggestive themes
Teen+ — 16+, moderate violence, profanity, stronger themes
Mature — 18+, nudity, explicit content, graphic violence
```
Help text: *Your call — comics have no ratings board. Unsure? Skip it; a wrong rating is worse than none.*

**7. Publication status** · Multiple choice · Optional
```
Ongoing
Complete
Upcoming
```

---

## Section 3 — Words

**8. Short description** · Paragraph · Optional
Help text: *One or two sentences. This is what appears on cards and in search results, and it gets clipped after about two lines.*

**9. Full description** · Paragraph · Optional
Help text: *The full pitch, for the book's own page. As long as you like.*

---

## Section 4 — Cover

**10. Cover image** · **File upload** · Optional
Help text: *Portrait works best — covers are shown at 2:3. Highest resolution you have.*

> **Upload, not a link.** Both images in the first creator submission arrived
> as unusable URLs: one Google Sites link that had already expired, and one
> Google Image *search thumbnail*. That is what asking for URLs produces.
>
> Note that Form uploads land in the owner's Drive **private by default**, so
> the importer cannot fetch them until the file is set to "anyone with the
> link" — or you download it and attach it in the Studio, which at this volume
> is honestly fine.

**11. Describe the cover** · Short answer · Optional
Help text: *For readers using a screen reader. Describe what the cover SHOWS — "A man kneels in floodwater cradling a child" — not what the book is. Skip it if the cover is just the title on a colour.*

---

## Section 5 — Where to get it

**12. Where to buy** · Paragraph · Optional
Help text: *One per line, as "Store — link". Put the option that pays you most first.*
Example to include in the help text:
```
My store — https://example.com/shop
Bookshop.org — https://bookshop.org/...
Amazon — https://amazon.com/...
```

> A line without a store name still imports — the hostname is used instead. A
> working link with a dull label beats a dropped link.

**13. Kickstarter link** · Short answer · Optional
Help text: *Only if a campaign is live. This renders as a prominent button, so remove it when the campaign ends.*

---

## Section 6 — Permission

**14. Can we publish this?** · Checkboxes · **Required** · one option, must be ticked
```
Yes — I own or have permission to share this cover and description, and ND Riot can use them to list this book.
```

---

## Considered and rejected: ISBN lookup

Asking for an ISBN and filling the rest in automatically is the obvious
shortcut. It was tested and does not work for this catalogue:

- **Google Books** returns HTTP 429 without an API key — the shared quota is
  exhausted, so it is not usable as-is.
- **Open Library** works keyless but found **one of five** of Joseph Christy's
  titles, and that single match may be a different author of the same surname.
- **Open Library cover art** for a title it *does* have came back as a
  43-byte placeholder. No usable image.

The books that most need help — self-published, KDP, small press — are exactly
the ones the databases do not carry. A lookup that hits one time in five still
requires checking all five, and an auto-filled wrong description is worse than
a blank field.

Worth revisiting only if someone tests Google Books **with an API key**: it
indexes KDP far more thoroughly than Open Library, so it may perform better.
That is untested, not a prediction.
