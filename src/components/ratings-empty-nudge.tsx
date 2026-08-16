"use client";

import { useState } from "react";

import { SignInDialog } from "@/components/sign-in-dialog";

/**
 * The "no ratings yet" line on a convention page for a signed-out visitor —
 * clicking it opens the same sign-in modal the Save button uses, nudging people
 * to join so they can participate. (Signed-in visitors get a plain line.)
 */
export function RatingsEmptyNudge({
  text,
  signInCopy,
}: {
  text: string;
  signInCopy: { title: string; body: string; cta: string };
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-primary focus-visible:ring-ring max-w-prose text-left text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        {text}
      </button>
      <SignInDialog
        open={open}
        onOpenChange={setOpen}
        title={signInCopy.title}
        body={signInCopy.body}
        cta={signInCopy.cta}
      />
    </>
  );
}
