"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

import { dismissRagBannerAction } from "@/app/actions/notifications";

/**
 * Home banner for signed-in creators while a Rag issue is accepting submissions.
 * Secondary teal (--personalize, the "for you" accent) with black text (white
 * fails AA on it, §9). Links to the open issue's page; the × dismisses it for
 * this submission period (remembered server-side via readerPrefs) — a new period
 * brings it back. Optimistically hides on click, then records the dismissal.
 */
export function RagSubmissionBanner({
  text,
  href,
  periodId,
  dismissLabel,
}: {
  text: string;
  href: string;
  periodId: string;
  dismissLabel: string;
}) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  const dismiss = () => {
    setHidden(true);
    void dismissRagBannerAction(periodId);
  };

  return (
    <div className="bg-personalize text-personalize-foreground">
      <div className="mx-auto flex max-w-[90rem] items-center gap-3 px-6 py-2.5">
        <Link
          href={href}
          className="focus-visible:ring-2 focus-visible:ring-black/60 focus-visible:outline-none flex-1 text-sm font-bold tracking-wide hover:underline"
        >
          {text}
        </Link>
        <button
          type="button"
          onClick={dismiss}
          /* aria-label is a non-CMS exception (§2) — an icon-only control's name. */
          aria-label={dismissLabel}
          className="focus-visible:ring-2 focus-visible:ring-black/60 focus-visible:outline-none -mr-1 shrink-0 p-1 transition-opacity hover:opacity-70"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
    </div>
  );
}
