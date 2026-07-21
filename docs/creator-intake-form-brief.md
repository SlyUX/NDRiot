# Brief: ND Riot creator intake form

Hand this to whoever builds the Google Form. It is written to be followed
literally — field order, wording, and option lists are all deliberate, and the
reasons are given where they are not obvious.

Keep this file in sync if the form changes. It is also the spec the eventual
import script maps against.

---

## What this form is for

ND Riot (ndriot.com) is a directory of independent comics and the people who
make them. This form is how a creator asks to be listed. Submissions are
reviewed by the ND Riot team and entered into the CMS by hand — nothing here
publishes automatically.

**It is a recruitment form, not a database import.** Every extra field costs
completions. Anything that can be chased later has been left out on purpose;
books get their own form once a creator exists.

## Settings

- **Title:** Get listed on ND Riot
- **Description:** *Independent comics, by the creators who make them. Tell us who you are and we'll build your profile. Everything here is reviewed by a human — we'll be in touch before anything goes live.*
- Collect email addresses: **on** (this is the reply channel, so do not also ask for email as a question)
- Limit to 1 response: **off** (no login requirement — an account wall costs more submissions than duplicates cost us)
- Progress bar: **on**
- Confirmation message: *Got it. We read every submission and will email you — usually within a week. If you don't hear back, check spam before assuming we hated it.*

---

## Section 1 — Who you are

**1. Your name** · Short answer · **Required**
Help text: *How you want to be credited. A pen name is completely fine.*

**2. Studio or trading name** · Short answer · Optional
Help text: *If you publish under a studio name — e.g. "Fox Storytelling". Leave blank if you publish under your own name.*

**3. Where you're based** · Short answer · Optional
Help text: *City and country, or as vague as you like. Used so readers can find local work.*

**4. Preferred web address** · Short answer · Optional
Help text: *Your page will live at ndriot.com/creators/your-name. Tell us if you want something specific — lowercase letters, numbers and hyphens only. Leave blank and we'll build it from your name.*

> **Why:** the slug is the one field that is expensive to change after launch,
> because links break. Cheap to ask now.

---

## Section 2 — Your work

**5. Tell us about your work** · Paragraph · **Required**
Help text: *A few sentences. What you make, what it's about, what you're trying to do. This becomes your profile bio, so write it in your voice rather than the third person.*

**6. What do you make?** · Checkboxes · Optional · *Allow "Other"*
Options, exactly:
```
Graphic Novel
Single Issue
Collected Edition
Anthology
Minicomic
Zine
Webcomic
```
Help text: *Tick everything that applies. Graphic Novel = a complete story in one volume. Single Issue = one instalment of a series. Collected Edition = a trade paperback. Anthology = short works, usually several creators. Minicomic = small-format, short-run, usually handmade. Zine = self-published, photocopier energy. Webcomic = screen-native, published online.*

**7. What genres do you work in?** · Checkboxes · Optional · *Allow "Other"* · **Limit to 3**
Options, exactly:
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
Help text: *Up to three. If yours isn't listed, use Other and tell us — we'd rather add a genre than squeeze you into the wrong one.*

> **Why fixed options rather than free text:** every genre is a browsable page
> on the site. "Sci-Fi" typed next to "Science Fiction" silently splits one
> page into two, and the only fix is editing every record by hand. The "Other"
> box is the escape hatch, and it is how we learn what to add.

**8. Who's it for?** · Multiple choice · Optional
Options, exactly:
```
All Ages — suitable for everyone, cartoon violence at most
Teen — 13+, mild violence and language, suggestive themes
Teen+ — 16+, moderate violence, profanity, stronger themes
Mature — 18+, nudity, explicit content, graphic violence
```
Help text: *Comics have no ratings board, so this is your call. If you're genuinely unsure, skip it — a wrong rating is worse than none.*

**8b. Are you open to collaboration?** · Multiple choice · Optional
Options, exactly:
```
Yes — I'm looking for collaborators
Not right now
```
Help text: *Shown as a badge on your profile. Change it any time — just email us.*

> **Why it earns a field:** ND Riot exists to connect independent creators to
> each other, not only to readers. A writer looking for an artist currently
> has to guess. "Not right now" and "no answer" render identically on the
> site — the badge only appears for a yes — but they are different signals to
> the team, and someone who actively said no should not be asked again next
> month.

---

## Section 3 — Where to find you

**9. Your website** · Short answer · Optional
Help text: *Your main site or storefront.*

**10. Social links** · Paragraph · Optional
Help text: *One per line, as full URLs. We support Instagram, X, Bluesky, TikTok and YouTube — anything else still works, it just gets a generic icon.*

> **Why one text box rather than a field per platform:** five optional fields
> read as five things you failed to fill in. One box that most people put two
> lines into is faster to complete and no harder to process by hand.

**11. Collectives or organisations you belong to** · Checkboxes · Optional · *Allow "Other"*
Options — these are the organisations already in the system:
```
Nash Illustrators
PiP Comics Collective
```
Help text: *Beyond your own studio. Pick from the list, or use Other and give us the exact name and website — we'll add it.*

> **Maintenance note:** this list must be kept in step with the Organization
> records in the CMS. It is short enough to update by hand for now; when it
> stops being, that is the signal to build the nightly sync described in
> `content-intake.md`.

---

## Section 4 — Pictures

**12. A photo or avatar of you** · Short answer · Optional
Help text: *Paste a link to an image — Dropbox, Drive, your own site, anywhere we can reach it. Square works best. If your studio logo is what you use as your avatar, that's fine, just say so.*

**13. Describe that image** · Short answer · Optional
Help text: *For readers using a screen reader. Describe what the picture SHOWS, not who it is — "A woman in a leather jacket at a convention table" rather than "Jane Doe, cartoonist". Skip it if it's just a plain headshot.*

> **Why this is a separate question:** asked together with the image, people
> write marketing copy. This has already happened once on the site — a cover
> image whose alt text read "112-page independent horror graphic novel by…",
> which a screen reader announced immediately after the title it duplicated.
> Asking separately, and asking what it *shows*, is what gets useful alt text.

**14. Studio or organisation logo** · Short answer · Optional
Help text: *A link, if you have one. It needs to work on a near-black background — a dark logo on transparency disappears. PNG or SVG.*

> **Why links rather than uploads:** file uploads require the submitter to be
> signed in to a Google account, which is a login wall on a recruitment form.
> A URL we can fetch costs the team ten seconds and costs the creator nothing.

---

## Section 5 — Permission

**15. Can we publish this?** · Checkboxes · **Required** · single option that must be ticked
Option text, exactly:
```
Yes — I own or have permission to share everything I've linked here, and ND Riot can use it to build my profile.
```

> **Why this is required and not a formality:** the site reproduces cover art
> and photographs. This is the record of who agreed and when, and it is far
> cheaper to collect now than to chase across fifty creators later. It is the
> one question here that is not merely operational.

**16. Anything else?** · Paragraph · Optional
Help text: *Anything we didn't ask. Books you want listed, people we should talk to, questions.*

---

## What the team does with a submission

1. Read it. Reply to the submitter either way.
2. Create any missing **Organization** records first — a creator can't reference one that doesn't exist.
3. Create the **Creator**: name, studio, location, bio, socials, photo, slug, and the collaboration flag.
4. Fill **alt text** from question 13, or leave blank if the image sits beside the name anyway.
5. Books are a separate pass, and a separate form. Question 16 is where people will mention them.

## Deliberately not asked

- **Email as a question** — form settings collect it; asking twice looks careless.
- **Book details** — a books form comes later. Bundling them makes this form long enough to abandon, and most creators have more than one.
- **Pronouns** — we have nowhere to display them yet. Adding the field before the profile shows it collects data for no purpose.
- **Anything with a "required" asterisk beyond name, bio and permission.** Everything else can be chased in a reply; a required field cannot be chased at all, because the person just leaves.
