"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";

import type { MentionOption } from "@/components/update-composer";
import { cn } from "@/lib/utils";

/**
 * The update body textarea with inline @-mentions. Type "@" and, once three
 * letters land, a grouped menu of creators / conventions / outlets appears with
 * thumbnails (so near-identical names are legible). Picking one attaches it as a
 * removable chip — the body text itself stays plain (the mention is stored as a
 * reference, rendered as a linked chip under the update), which keeps the whole
 * feed render path unchanged. The chips ride hidden `mentions` inputs so the
 * plain <form action> still receives them.
 */

/** Don't surface matches until this many characters follow the "@". */
const MENTION_MIN = 3;
/** Matches the server-side MENTION_CAP in the post action. */
const MENTION_CAP = 8;
const PER_GROUP = 6;

const fieldClass =
  "focus-visible:ring-ring w-full border border-white/20 bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:outline-none";
const groupHeadingClass =
  "text-muted-foreground mb-1.5 text-[10px] font-bold tracking-widest uppercase";

export type MentionTextareaLabels = {
  mentionHint: string;
  mentionNoMatch: string;
  mentionCreatorsGroup: string;
  mentionBooksGroup: string;
  mentionConventionsGroup: string;
  mentionMediaGroup: string;
};

function MentionThumb({ option }: { option: MentionOption }) {
  if (!option.thumb) {
    return <span className="bg-muted size-6 shrink-0" aria-hidden="true" />;
  }
  return (
    <Image
      src={option.thumb}
      alt=""
      width={24}
      height={24}
      className="size-6 shrink-0 object-cover"
    />
  );
}

export function MentionTextarea({
  name,
  defaultValue,
  placeholder,
  maxLength,
  options,
  initialSelected,
  labels,
}: {
  name: string;
  defaultValue?: string;
  placeholder: string;
  maxLength: number;
  options: MentionOption[];
  initialSelected?: MentionOption[];
  labels: MentionTextareaLabels;
}) {
  const [body, setBody] = useState(defaultValue ?? "");
  const [selected, setSelected] = useState<MentionOption[]>(
    initialSelected ?? [],
  );
  // The active "@…" being typed: where it starts and what follows it.
  const [token, setToken] = useState<{ start: number; query: string } | null>(
    null,
  );
  const [highlight, setHighlight] = useState(0);
  const ref = useRef<HTMLTextAreaElement>(null);

  const selectedIds = useMemo(
    () => new Set(selected.map((o) => o.id)),
    [selected],
  );

  // Find an "@token" immediately before the caret — at the start of the text or
  // after whitespace, so an email's "@" never triggers it.
  const syncToken = (value: string, caret: number) => {
    const match = value.slice(0, caret).match(/(?:^|\s)@([^\s@]*)$/);
    if (match) {
      setToken({ start: caret - match[1].length - 1, query: match[1] });
      setHighlight(0);
    } else {
      setToken(null);
    }
  };

  const q = token?.query.trim().toLowerCase() ?? "";
  const showMatches = token != null && q.length >= MENTION_MIN;
  const matches = showMatches
    ? options.filter(
        (o) => !selectedIds.has(o.id) && o.label.toLowerCase().includes(q),
      )
    : [];
  const groups = [
    { key: "creator", label: labels.mentionCreatorsGroup },
    { key: "book", label: labels.mentionBooksGroup },
    { key: "convention", label: labels.mentionConventionsGroup },
    { key: "media", label: labels.mentionMediaGroup },
  ]
    .map((g) => ({
      ...g,
      items: matches.filter((o) => o.group === g.key).slice(0, PER_GROUP),
    }))
    .filter((g) => g.items.length > 0);
  // Flattened in display order, for keyboard navigation.
  const flat = groups.flatMap((g) => g.items);

  const pick = (option: MentionOption) => {
    if (!token) return;
    const { start, query } = token;
    // Replace the "@query" fragment with the full "@Name " inline — it reads in
    // the sentence and the feed linkifies it; the ref rides a hidden input.
    const insert = `@${option.label} `;
    setBody(
      (prev) =>
        prev.slice(0, start) + insert + prev.slice(start + 1 + query.length),
    );
    setSelected((prev) =>
      prev.length < MENTION_CAP && !selectedIds.has(option.id)
        ? [...prev, option]
        : prev,
    );
    setToken(null);
    const caret = start + insert.length;
    requestAnimationFrame(() => {
      const el = ref.current;
      if (el) {
        el.focus();
        el.setSelectionRange(caret, caret);
      }
    });
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!token || flat.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((h) => (h + 1) % flat.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((h) => (h - 1 + flat.length) % flat.length);
    } else if (event.key === "Enter") {
      // Enter picks the highlighted match instead of posting / newlining.
      event.preventDefault();
      pick(flat[highlight] ?? flat[0]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setToken(null);
    }
  };

  return (
    <div className="space-y-2">
      <textarea
        ref={ref}
        name={name}
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          syncToken(e.target.value, e.target.selectionStart ?? e.target.value.length);
        }}
        onKeyUp={(e) =>
          syncToken(
            e.currentTarget.value,
            e.currentTarget.selectionStart ?? e.currentTarget.value.length,
          )
        }
        onClick={(e) =>
          syncToken(
            e.currentTarget.value,
            e.currentTarget.selectionStart ?? e.currentTarget.value.length,
          )
        }
        onKeyDown={onKeyDown}
        required
        rows={3}
        maxLength={maxLength}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={token != null}
        aria-controls="mention-listbox"
        className={cn(fieldClass, "resize-y")}
      />

      {token != null &&
        (showMatches ? (
          flat.length > 0 ? (
            <div
              id="mention-listbox"
              role="listbox"
              className="max-h-60 space-y-3 overflow-y-auto border border-white/20 p-3"
            >
              {groups.map((group) => (
                <div key={group.key}>
                  <p className={groupHeadingClass}>{group.label}</p>
                  <ul>
                    {group.items.map((option) => {
                      const idx = flat.indexOf(option);
                      return (
                        <li key={option.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={idx === highlight}
                            // mousedown, not click: fire before the textarea blurs.
                            onMouseDown={(e) => {
                              e.preventDefault();
                              pick(option);
                            }}
                            onMouseEnter={() => setHighlight(idx)}
                            className={cn(
                              "flex w-full items-center gap-2 px-2 py-1 text-left text-sm",
                              idx === highlight && "bg-primary/10 text-primary",
                            )}
                          >
                            <MentionThumb option={option} />
                            <span className="truncate">{option.label}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">{labels.mentionNoMatch}</p>
          )
        ) : (
          <p className="text-foreground text-xs">{labels.mentionHint}</p>
        ))}

      {/* Tag refs for the action — only those whose "@Name" is still in the text,
          so deleting the inline mention drops the reference too. */}
      {selected
        .filter((option) => body.includes(`@${option.label}`))
        .map((option) => (
          <input
            key={option.id}
            type="hidden"
            name="mentions"
            value={option.id}
          />
        ))}
    </div>
  );
}
