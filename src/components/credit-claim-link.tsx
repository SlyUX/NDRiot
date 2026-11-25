"use client";

import { useState, useTransition } from "react";

import { createCreditClaim } from "@/app/actions/credits";
import { Spinner } from "@/components/ui/spinner";

/**
 * Owner-only control beside a plain-name credit: generates the shareable claim
 * link for that credit and copies it, so the owner can send it to the
 * collaborator however they like. ND Riot never emails the invitee.
 */
export function CreditClaimLink({
  bookId,
  creditKey,
  label,
  copiedLabel,
}: {
  bookId: string;
  creditKey: string;
  label: string;
  copiedLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — the link stays visible for manual copy.
    }
  }

  function generate() {
    setError(null);
    startTransition(async () => {
      const result = await createCreditClaim(bookId, creditKey);
      if (result.ok) {
        setUrl(result.url);
        await copy(result.url);
      } else {
        setError(result.error);
      }
    });
  }

  if (url) {
    return (
      <span className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={() => copy(url)}
          className="text-primary focus-visible:ring-ring text-[11px] font-bold tracking-wide uppercase focus-visible:ring-2 focus-visible:outline-none"
        >
          {copied ? copiedLabel : label}
        </button>
        <input
          type="text"
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="border-border bg-transparent w-56 max-w-full border px-2 py-1 text-[11px]"
        />
      </span>
    );
  }

  return (
    <span className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={generate}
        disabled={pending}
        className="text-muted-foreground hover:text-primary focus-visible:ring-ring inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wide uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
      >
        {pending && <Spinner className="size-3" />}
        {label}
      </button>
      {error && <span className="text-destructive text-[11px]">{error}</span>}
    </span>
  );
}
