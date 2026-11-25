"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { claimCredit } from "@/app/actions/credits";
import { Spinner } from "@/components/ui/spinner";

/**
 * The collaborator's "Claim as <me>" action on /claim/[token]. Claiming is
 * consent, so on success the credit is already linked + confirmed; we show a
 * done state linking to the comic.
 */
export function ClaimButton({
  token,
  label,
  doneLabel,
  comicHref,
  comicTitle,
}: {
  token: string;
  label: string;
  doneLabel: string;
  comicHref: string | null;
  comicTitle: string;
}) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function claim() {
    setError(null);
    startTransition(async () => {
      const result = await claimCredit(token);
      if (result.ok) {
        setDone(true);
        router.refresh();
      } else {
        setError(result.error ?? "Something went wrong.");
      }
    });
  }

  if (done) {
    return (
      <div className="space-y-3">
        <p className="text-primary text-sm font-bold">{doneLabel}</p>
        {comicHref && (
          <Link
            href={comicHref}
            className="text-primary text-sm tracking-widest uppercase underline underline-offset-4"
          >
            {comicTitle}
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={claim}
        disabled={pending}
        className="bg-primary text-primary-foreground border-primary focus-visible:ring-ring inline-flex items-center gap-2 border px-5 py-2.5 text-sm font-bold tracking-widest uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
      >
        {pending && <Spinner className="size-4" />}
        {label}
      </button>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
