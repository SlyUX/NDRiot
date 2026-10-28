"use client";

/** A no-print button that triggers the browser's print dialog. */
export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="bg-primary text-primary-foreground px-4 py-2 text-sm font-black tracking-widest uppercase"
    >
      {label}
    </button>
  );
}
