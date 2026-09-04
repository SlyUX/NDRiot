"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Replays a left-to-right slide-in on its children whenever `token` changes —
 * the homepage uses it so a section slides in when (and only when) it is
 * reshuffled. `token` is a signature of the current arrangement (the hero's
 * feature id, the comics row's ordered ids), so an unrelated navigation that
 * leaves the section untouched carries the same token and no animation plays.
 *
 * The children are server-rendered and passed straight through — this only
 * drives the animation on the client. First mount never animates (nothing
 * changed yet), and `prefers-reduced-motion` skips it entirely (§10).
 */
export function SlideOnChange({
  token,
  children,
  className,
}: {
  token: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const previous = useRef(token);

  useEffect(() => {
    if (previous.current === token) return; // first mount, or no real change
    previous.current = token;
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    // Remove + force reflow + re-add so the keyframes restart on every shuffle.
    el.classList.remove("shuffle-slide");
    void el.offsetWidth;
    el.classList.add("shuffle-slide");
  }, [token]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
