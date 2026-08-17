import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/json-ld";
import { SectionHeading } from "@/components/section-heading";
import { Section } from "@/components/ui/section";
import { pageMetadata } from "@/lib/page-metadata";
import { getSiteSettings } from "@/lib/site-settings";
import { breadcrumbSchema, jsonLdGraph } from "@/lib/structured-data";

export const dynamic = "force-dynamic";

/**
 * Privacy policy. Deliberately written in-code rather than CMS (an acknowledged
 * §2 exception): it's legal text that must be live and accurate the moment the
 * OAuth consent screen points at it, it rarely changes, and version control is
 * the right record of "what the policy said, and when." Update LAST_UPDATED
 * whenever the text below changes. Can move to a CMS `body` field later.
 *
 * Every claim here is checked against the actual code: Google sign-in requests
 * only name/email (src/auth.ts, no extra scopes); follows are stored keyed to a
 * hash of the email in the private ndriot_auth dataset (reader-client); the
 * newsletter email goes straight to MailerLite and is never stored by us
 * (lib/mailerlite.ts); contact goes out via Resend (actions/contact.ts);
 * analytics is Vercel Analytics (root layout).
 */
const LAST_UPDATED = "August 17, 2026";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return pageMetadata({
    title: "Privacy Policy",
    description: `How ${settings.siteTitle} handles your data — plainly. We use Google only to confirm your identity, store no passwords, and never sell your information.`,
    path: "/privacy",
    siteTitle: settings.siteTitle,
  });
}

export default async function PrivacyPage() {
  const settings = await getSiteSettings();
  const name = settings.siteTitle;

  return (
    <Section
      as="article"
      padding="md"
      maxWidth="3xl"
      innerClassName="space-y-8"
    >
      <JsonLd
        data={jsonLdGraph(
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Privacy Policy", path: "/privacy" },
          ]),
        )}
      />

      <header className="space-y-2">
        <h1 className="text-4xl font-black tracking-tighter uppercase sm:text-5xl">
          Privacy Policy
        </h1>
        <p className="text-muted-foreground text-sm">
          Last updated {LAST_UPDATED}
        </p>
      </header>

      <div className="max-w-prose space-y-8 leading-relaxed">
        <p className="text-foreground/90">
          {name} is a directory and advocate for independent comics. This page
          explains, in plain terms, what we collect, why, and what we do
          <em> not</em> do. The short version: we use Google only to confirm who
          you are, we store no passwords, we don&rsquo;t sell your data, and we
          have no ad trackers.
        </p>

        <section className="space-y-3">
          <SectionHeading as="h2" size="md">
            Signing in with Google
          </SectionHeading>
          <p className="text-foreground/85">
            When you sign in, we use &ldquo;Sign in with Google&rdquo; purely to
            verify your identity. Google shares your <strong>name</strong> and{" "}
            <strong>email address</strong> with us — nothing more. We never
            receive or store your Google password, and we have{" "}
            <strong>no access</strong> to your Google Docs, Drive, Gmail,
            contacts, or any other Google data.
          </p>
        </section>

        <section className="space-y-3">
          <SectionHeading as="h2" size="md">
            What we store
          </SectionHeading>
          <ul className="text-foreground/85 list-disc space-y-2 pl-5">
            <li>
              <strong>Comics and creators you follow.</strong> Saved to a
              private store, keyed to a one-way hash of your email (not your
              email sitting next to the list), kept separate from the public
              directory. It exists only to show you your own feed.
            </li>
            <li>
              <strong>Creator, comic, and outlet profiles.</strong> If you list
              yourself or your work, the information you submit is published in
              the public directory — that is the point of it. Don&rsquo;t put
              anything in a profile you don&rsquo;t want public.
            </li>
            <li>
              <strong>Newsletter email.</strong> If you opt in to ND Noise, your
              email address is held by our email provider (MailerLite) to send
              it. We don&rsquo;t keep a second copy.
            </li>
            <li>
              <strong>Messages you send us.</strong> If you use the contact
              form, your name, email, and message are emailed to us so we can
              reply.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <SectionHeading as="h2" size="md">
            How we use it
          </SectionHeading>
          <p className="text-foreground/85">
            To run the directory: confirm you own the profile you&rsquo;re
            editing, show you updates from the creators and comics you follow,
            send you the newsletter you asked for, and reply when you contact
            us. That&rsquo;s the whole list.
          </p>
        </section>

        <section className="space-y-3">
          <SectionHeading as="h2" size="md">
            Who processes your data
          </SectionHeading>
          <p className="text-foreground/85">
            {name} is a small operation and relies on a few service providers,
            each getting only what its job needs:
          </p>
          <ul className="text-foreground/85 list-disc space-y-1.5 pl-5">
            <li>
              <strong>Google</strong> — sign-in (identity).
            </li>
            <li>
              <strong>Sanity</strong> — content and profile storage.
            </li>
            <li>
              <strong>Vercel</strong> — hosting and privacy-friendly, aggregate
              analytics (it doesn&rsquo;t build a personal profile of you or
              track you across other sites).
            </li>
            <li>
              <strong>MailerLite</strong> — the newsletter.
            </li>
            <li>
              <strong>Resend</strong> — delivering contact-form messages to us.
            </li>
          </ul>
          <p className="text-foreground/85">
            We do <strong>not</strong> sell, rent, or trade your information.
          </p>
        </section>

        <section className="space-y-3">
          <SectionHeading as="h2" size="md">
            Cookies
          </SectionHeading>
          <p className="text-foreground/85">
            When you sign in we set a single session cookie — an encrypted token
            that keeps you logged in. We don&rsquo;t use advertising or
            cross-site tracking cookies.
          </p>
        </section>

        <section className="space-y-3">
          <SectionHeading as="h2" size="md">
            Your choices
          </SectionHeading>
          <ul className="text-foreground/85 list-disc space-y-1.5 pl-5">
            <li>Unsubscribe from the newsletter from any email it sends.</li>
            <li>Sign out any time; the session cookie is cleared.</li>
            <li>
              Ask us to delete your saved data or a profile you own — just{" "}
              <Link href="/contact" className="text-primary hover:underline">
                contact us
              </Link>
              .
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <SectionHeading as="h2" size="md">
            Children
          </SectionHeading>
          <p className="text-foreground/85">
            {name} isn&rsquo;t directed at children under 13, and we don&rsquo;t
            knowingly collect their information.
          </p>
        </section>

        <section className="space-y-3">
          <SectionHeading as="h2" size="md">
            Changes
          </SectionHeading>
          <p className="text-foreground/85">
            If we update this policy, the &ldquo;last updated&rdquo; date above
            will change. Material changes will be noted on the site.
          </p>
        </section>

        <section className="space-y-3">
          <SectionHeading as="h2" size="md">
            Contact
          </SectionHeading>
          <p className="text-foreground/85">
            Questions about your data or this policy? Reach us through the{" "}
            <Link href="/contact" className="text-primary hover:underline">
              contact page
            </Link>
            .
          </p>
        </section>
      </div>
    </Section>
  );
}
