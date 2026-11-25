"use client";

import { useState, useTransition } from "react";

import { reassignOwnership } from "@/app/actions/ownership";
import { Spinner } from "@/components/ui/spinner";

/**
 * One creator's ownership row in the admin tool: shows the current owner and an
 * inline field to reassign it to a different email. Admin-only (the page and the
 * action both gate on isAdminEmail).
 */
export function OwnershipRow({
  creatorId,
  name,
  slug,
  currentOwner,
}: {
  creatorId: string;
  name: string;
  slug: string | null;
  currentOwner: string | null;
}) {
  const [owner, setOwner] = useState(currentOwner);
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await reassignOwnership(creatorId, value);
      if (result.ok) {
        setOwner(result.email);
        setValue("");
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="border-border flex flex-col gap-2 border-b py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-bold">
          {slug ? (
            <a
              href={`/creators/${slug}`}
              className="hover:text-primary transition-colors"
            >
              {name}
            </a>
          ) : (
            name
          )}
        </p>
        <p className="text-muted-foreground text-xs">
          {owner ? (
            <>
              Owner: <span className="text-foreground">{owner}</span>
            </>
          ) : (
            "Unclaimed"
          )}
        </p>
      </div>
      <form onSubmit={submit} className="flex items-center gap-2">
        <input
          type="email"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="new.owner@email.com"
          aria-label={`Reassign ${name} to`}
          className="focus-visible:ring-ring w-56 max-w-full border border-white/20 bg-transparent px-3 py-1.5 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:outline-none"
        />
        <button
          type="submit"
          disabled={pending || !value.trim()}
          className="bg-primary text-primary-foreground border-primary focus-visible:ring-ring inline-flex items-center gap-1.5 border px-3 py-1.5 text-xs font-bold tracking-widest uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
        >
          {pending && <Spinner className="size-3.5" />}
          {saved ? "Saved" : "Reassign"}
        </button>
      </form>
      {error && (
        <p role="alert" className="text-destructive text-xs sm:w-full sm:text-right">
          {error}
        </p>
      )}
    </div>
  );
}
