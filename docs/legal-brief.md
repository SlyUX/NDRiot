# ND Riot — Legal Briefing for Terms of Service & Privacy Policy

**Purpose.** This document briefs a legal-skilled assistant to draft two documents for ND Riot: a **Terms of Service (ToS)** and a **Privacy Policy**. It describes what the platform is, who uses it, exactly what data is collected and where it lives, how user-generated content and IP work, the content-safety posture, and the principles that should shape tone and specific clauses. Facts here are drawn from the live application and its existing plain-language privacy page (which is fact-checked against the code).

> **Note for the drafter:** ND Riot has an existing, deliberately plain-spoken `/privacy` page (summarized in §13). Please align the new Privacy Policy with its *substance and voice* while making it legally complete. Several items need the operator's confirmation — collected in §12 (**Open questions**). Where a fact isn't stated here, flag it rather than inventing it.

---

## 1. What ND Riot is

- **ND Riot** is a public **directory and editorial platform for independent ("indie") comics**, live at **https://ndriot.com**. It showcases indie creators and their work, editorial content, a conventions directory, free downloads/resources, a magazine ("ND Riot Rag"), on-site single-page comics ("Strips"), and a monthly personalized newsletter ("ND Noise").
- **It is a directory and showcase, not a store.** ND Riot does **not** sell comics or process any payments. Where a comic is purchasable, ND Riot links **out** to the creator's external storefront. There is **no e-commerce, no checkout, and no payment data** on ND Riot.
- **Operator:** Stephen Fox, operating as **Sly UX** (slyux.com). ND Riot is a small, largely solo operation.
- **Jurisdiction:** US-based project; American English; primarily US audience (see §12 for governing-law state + business-entity confirmation).
- **Contact:** via the on-site contact form; operator email `fox@slyux.com`; notification/reply address `submission@ndriot.com`.

## 2. Users and roles

- **Readers** — browse and discover; may create an account (Google sign-in) to save/follow comics & creators (private), see a personalized dashboard/feed, and subscribe to the newsletter.
- **Creators** — indie comic creators who list themselves and their work. With an account they can submit and manage a creator profile, comics, and on-site Strips; post short updates; mark convention appearances; rate convention venues; "cosign" peers; and use a collaboration-contact feature.
- **Media outlets & Allies** — outlets (podcasts, review sites, etc.) can list; "Allies" are curated partners ND Riot vouches for. Both are largely operator-curated.
- **Operator/Admin** — Stephen; reviews and publishes submissions, sends the newsletter, manages the site.

## 3. Accounts & authentication

- Sign-in is **exclusively "Sign in with Google" (OAuth via Auth.js).** There are **no passwords** created, stored, or checked by ND Riot.
- Google shares only the user's **name** and **email address** — **no additional scopes** (no Drive, Gmail, contacts, etc.). Verified in `src/auth.ts`.
- The user's **email address is the identity key** that ties an account to what it owns and follows.
- A single **encrypted session cookie** (an Auth.js JWT) keeps the user logged in. No advertising or cross-site tracking cookies are used.

## 4. Functionality relevant to the Terms

- **Discovery / browsing** — public, no account required. Ordering is random or neutral (e.g., recency, alphabetical); there is **no behavioral tracking, no engagement-based ranking, and no inferred personalization**. (This is a core product principle, §10.)
- **Save / follow** — a signed-in reader can privately save comics, creators, and Strips ("Save = Follow"). Drives a personal feed. Private and explicit; never aggregated into public "popularity."
- **Newsletter ("ND Noise")** — opt-in, double opt-in, a monthly personalized digest of the creators/comics a subscriber follows, plus a shared "Sunday Strips" section and an editorial note. One-click unsubscribe in every send.
- **Creator submissions (intake)** — creators submit profiles, comics, media outlets, and Strips through on-site forms. **All submissions are currently human-reviewed before they go live** (review-gated). *(A move toward creator self-service publishing is planned — see §8.)*
- **Creator-authored content** — signed-in creators can post short **updates**, mark **convention appearances**, submit **venue ratings** (per-aspect, attributed; never a public leaderboard), and **"cosign"** other creators (a public endorsement derived from a mutual follow).
- **Collaboration contact** — creators open to collaboration can send another creator a one-time contact **relayed over email** (no stored inbox on ND Riot).
- **Image & text uploads** — creators upload cover images, avatars, update images, and single-page Strip artwork; these are stored on the CMS (Sanity) and displayed publicly. Text (bios, descriptions, captions) likewise.
- **RSS embeds** — media outlets/creators may list an RSS feed URL; for media it's shown only with an explicit consent flag.
- **Contact form** — sends the visitor's name, email, and message to the operator by email (via Resend). Not stored in the public dataset.

## 5. Data collected & stored — and exactly where (for the Privacy Policy)

ND Riot minimizes data and segregates anything tied to a person's identity. Storage locations:

| Data | Where it lives | Notes |
|---|---|---|
| **Published content** — creator/comic/media profiles, Strips, editorial, conventions, images, bios, links | **Sanity, public dataset (`production`)** | World-readable by design — this *is* the directory. Users are told not to put anything private in a profile. |
| **Saves/follows** — which items a reader follows | **Sanity, PRIVATE dataset (`ndriot_auth`)** | Keyed to a **one-way SHA-256 hash of the reader's email** + item id — the email does **not** sit next to the list. Never in the public dataset. Exists only to render that reader's own feed. |
| **Ownership map** — which Google email owns which creator/media doc | **Sanity, PRIVATE dataset (`ndriot_auth`)** | So a creator can only edit what they own. |
| **Notification bookkeeping** — once-only "already-notified" markers, pending-send queues | **Sanity, PRIVATE dataset (`ndriot_auth`)** | Operational only. |
| **Newsletter subscriber email** | **MailerLite** (third party) | ND Riot keeps **no second copy**. MailerLite is the sole source of truth for subscription; double opt-in. |
| **Outbound email sending** (notifications, the newsletter digest, contact-form relay) | **Resend** (third party) | Sends from the `resend.ndriot.com` subdomain; reply-to `submission@ndriot.com`. |
| **Contact-form messages** | Delivered by **Resend** to the operator's inbox | Name, email, message — emailed so the operator can reply; not stored in the public dataset. |
| **Session cookie** | Set in the reader's browser | Encrypted Auth.js JWT; login only. |
| **Analytics** | **Vercel Analytics** | Privacy-friendly, **cookieless**, **aggregate**; does not build a personal profile or track across other sites. |

**Sub-processors (third-party services), each receiving only what its job needs:**

- **Google** — sign-in / identity (name + email).
- **Sanity** — content & profile storage (both the public and the private datasets).
- **MailerLite** — newsletter subscriber list & sending.
- **Resend** — transactional & newsletter email delivery.
- **Vercel** — application hosting + cookieless aggregate analytics.
- **Cloudflare** — DNS and CDN/security in front of the domain. *(Planned: Cloudflare CSAM scanning for uploaded images, and Cloudflare R2 for larger file storage — see §8.)*
- **Fastmail** — the operator's inbound email (receives contact/reply mail).
- **Google Search Console** — search-indexing diagnostics (no personal user data).

**ND Riot does not sell, rent, or trade user information, and runs no advertising or cross-site trackers.**

## 6. User-generated content, IP & licensing

- **Creators retain all rights to their work.** ND Riot is a **non-exclusive** showcase — no rights grabs, no exclusivity requirements.
- By submitting content (images, text, links), a creator should be understood to **grant ND Riot a limited, non-exclusive license to host, display, reproduce, and distribute that content on the site and in the ND Riot newsletter** for the purpose of running the directory. (Drafter: please formalize scope, and confirm whether the newsletter display is in scope — it is intended to be.)
- **Strips** (single-page comics) are **hosted on ND Riot and read on-site.** Full comics are **not** hosted — they link out to the creator's external store.
- **User submissions must be the creator's own work** (or work they're authorized to post). The ToS should require this warranty.
- ND Riot should reserve the right to **remove or decline** any content at its discretion, especially policy violations.
- **Endorsements/ratings/updates** are user-generated opinions; the ToS should disclaim ND Riot's responsibility for them and set conduct rules.

## 7. Conduct & acceptable use (for the ToS)

- No unlawful content; no infringement of others' IP; no harassment; no impersonation; no spam/abuse of the contact, collaboration, or submission features (these already have anti-spam measures).
- One account per person; a creator may claim/own only profiles they are entitled to (there's already a one-profile-per-Google-account guardrail).
- Mature comic art **is permitted and is maturity-rated** (see §8) — the line is unlawful/prohibited content, not adult artistic content.

## 8. Content safety & moderation (important — shapes several clauses)

- **Today:** every creator submission is **human-reviewed before it goes live**. This manual gate is the current safety posture.
- **Planned:** creator **self-service publishing** (creators publish edits without a manual gate). Before that ships, ND Riot intends to add **automated moderation as triage** for uploaded images:
  - **CSAM detection is non-negotiable.** ND Riot intends to enable **Cloudflare's (free) CSAM scanning** on user-uploaded images. The legal docs must reflect ND Riot's zero-tolerance for CSAM and its intent to detect, remove, preserve as required, and **report to NCMEC / authorities** as legally obligated.
  - **NSFW/adult triage:** because this is a comics platform, **mature/adult *art* is legitimate and is already maturity-rated.** Automated NSFW detection (if used) is for **triage** (holding likely-prohibited uploads for review), **not** to ban adult artistic content.
- **The Privacy Policy should note** that uploaded images may be scanned by automated safety tooling (e.g., a hash-based CSAM scanner) as a condition of hosting.
- **Maturity ratings:** comics carry maturity ratings; mature content can be hidden. The docs should address **age-appropriate access** to mature material (see §12 for the age policy to confirm).

## 9. Legal frameworks to address

- **DMCA / copyright:** Include a **notice-and-takedown** process and a **designated DMCA agent** (contact + method). (Confirm agent details, §12.)
- **Intermediary/UGC liability (US Section 230 framing):** ND Riot hosts user content; the ToS should position ND Riot as a host/curator, not the author of user submissions, while acknowledging it does review/curate.
- **CAN-SPAM (email):** The newsletter is double opt-in with one-click unsubscribe and a `List-Unsubscribe` header; the Privacy Policy/ToS should reflect lawful commercial-email practice and a valid postal contact if required.
- **CSAM / NCMEC:** As in §8 — mandatory reporting posture.
- **Children's privacy (COPPA):** ND Riot is **not directed at children under 13** and does not knowingly collect their data. Confirm the account minimum age and any mature-content age restriction (§12).
- **US state & international privacy (CCPA/CPRA, GDPR):** Primarily US, but the site is globally reachable and MailerLite/Stripe touch EU/UK/US. Provide reasonable **data-access and deletion rights** (already offered informally: users can ask, via the contact form, to delete saved data or a profile they own) and describe them properly. Confirm how far to go on GDPR/CCPA formalities (§12).
- **Standard commercial terms:** disclaimers of warranties, limitation of liability, indemnification (esp. for user-submitted content), account termination/suspension, changes to terms, governing law & venue, severability, entire agreement.

## 10. Principles & values (shape the tone and specific stances)

ND Riot is a punk, creator-first, indie-comics project. The legal documents should be **plain-spoken and legible** (the existing privacy page is deliberately jargon-light) while remaining sound. Core commitments to reflect:

- **Creator-first, no exploitation:** non-exclusive, no rights grabs; creators keep their rights.
- **Privacy by minimization:** collect little; email is used only for identity and the subscription the user asked for; **no selling data; no ad tracking; no cross-site profiling.**
- **Discovery is user-directed, never inferred:** no behavioral tracking, no engagement KPIs, no popularity/algorithmic ranking, no "because you viewed." The only personalization is what a user *explicitly* asked for (their follows, their subscription).
- **Transparency:** say plainly what is collected and why, and what is *not* done.

## 11. What ND Riot does NOT do (helps scope the documents)

- Does **not** process payments or run a store (links out instead) → **no payment/financial data**.
- Does **not** store passwords (Google OAuth only).
- Does **not** run advertising, ad trackers, or cross-site tracking cookies.
- Does **not** sell, rent, or trade personal data.
- Does **not** rank content by engagement or infer interests from behavior.
- Does **not** keep a second copy of newsletter emails (MailerLite holds them).
- Does **not** store personally identifying data in the public dataset (saves/ownership live in a separate private store, email hashed).

## 12. Open questions to confirm with the operator (please flag, don't guess)

1. **Governing law / venue:** which US state's law governs, and where are disputes venued? (Operator is US-based; state to confirm.)
2. **Business entity:** Is "Sly UX" a registered entity (e.g., LLC) or a sole proprietorship / DBA? What legal name and address should appear? Is a **postal address** available for CAN-SPAM / notices?
3. **DMCA designated agent:** name, email, and mailing address for takedown notices (and whether registered with the US Copyright Office).
4. **Minimum account age:** confirm **13+** (COPPA floor) vs a higher bar, and whether **mature-rated content** requires an age affirmation/gate (18+?) for viewing.
5. **Privacy-law reach:** How formally to implement **GDPR/CCPA** rights (data access/portability/deletion, "do not sell" — noting ND Riot doesn't sell)? Minimal-but-honest, or full regional sections?
6. **Newsletter content license:** confirm that displaying a creator's followed content **inside the newsletter** is within the granted license.
7. **Retention:** how long to keep saves/ownership records after a profile is deleted or an account goes inactive? (Currently: deletion on request.)
8. **Effective date & change process** for both documents.

## 13. Reference — the existing `/privacy` page (fact-checked against code)

The current plain-language privacy page (last updated Aug 17, 2026) states, in substance:

- Sign in with Google is used **only to verify identity**; Google shares **name + email**, nothing more; **no password** received/stored; **no access** to Drive/Gmail/contacts/other Google data.
- **What is stored:** (a) comics/creators you follow — private store, keyed to a **one-way hash of your email**, separate from the public directory, exists only to show your feed; (b) profiles you submit — published publicly (that's the point; don't put private info there); (c) newsletter email — held by **MailerLite**, no second copy; (d) contact-form messages — emailed to the operator to reply.
- **How it's used:** confirm profile ownership; show followed updates; send the requested newsletter; reply to contact. "That's the whole list."
- **Processors:** Google (identity), Sanity (storage), Vercel (hosting + privacy-friendly aggregate analytics), MailerLite (newsletter), Resend (contact delivery). **No selling/renting/trading data.**
- **Cookies:** one encrypted session cookie for login; **no ad/cross-site cookies.**
- **Choices:** unsubscribe from any newsletter email; sign out any time; **ask to delete** saved data or an owned profile via the contact page.
- **Children:** not directed at under-13; no knowing collection.
- **Changes:** "last updated" date changes; material changes noted on the site.
- **Contact:** via the contact page.

*(The drafter should treat this as the source of truth for current practice and extend it — e.g., adding Cloudflare and Fastmail as processors, the UGC/IP license, content-safety/CSAM scanning, DMCA, conduct rules, and the standard ToS clauses — rather than contradicting it.)*

---

### Deliverables requested
1. **Terms of Service** for ND Riot (readers + creators; UGC; IP license; conduct; content policy incl. mature-art vs. prohibited content; DMCA; disclaimers/liability/indemnity; termination; governing law; changes).
2. **Privacy Policy** for ND Riot (data collected & why; the storage/segregation model in §5; sub-processors; cookies; user rights/choices; children; security; international/US-state privacy as scoped; contact).

Please produce plain-language, legally sound drafts, mark every assumption, and list anything from §12 that still needs the operator's input.
