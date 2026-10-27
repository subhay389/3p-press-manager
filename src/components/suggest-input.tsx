"use client";

import { useState, type ChangeEvent, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SuggestInputProps = {
  id: string;
  value: string;
  className: string;
  "aria-expanded": boolean;
  "aria-controls": string | undefined;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onClick: () => void;
};

/**
 * Text box with a dropdown of known values (clients, categories) instead of
 * the browser's own suggestion popup. Typing still works and narrows the list;
 * a new value can be typed in full. The list scrolls when it is long.
 * `children` renders the input itself, so it fits the job card or a form.
 */
export function SuggestInput({
  id,
  value,
  options,
  normalize,
  listLabel,
  match = (option, typed) => option.includes(typed),
  emptyText,
  onChange,
  className,
  children,
}: {
  id: string;
  value: string;
  options: string[];
  /** Makes typed text and options comparable (case, spaces). */
  normalize: (v: string) => string;
  listLabel: string;
  /** Whether an option fits the typed text (both normalized). Default: contains. */
  match?: (option: string, typed: string) => boolean;
  /** Shown in the open list when there are no options at all. */
  emptyText?: string;
  onChange: (v: string) => void;
  className?: string;
  children: (props: SuggestInputProps) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const typed = normalize(value);
  // A chosen value shows the whole list again, so it's easy to switch.
  const exact = options.some((o) => normalize(o) === typed);
  const shown = exact ? options : options.filter((o) => match(normalize(o), typed));
  const listId = `${id}-options`;
  const empty = options.length === 0 && !!emptyText;
  const expanded = open && (shown.length > 0 || empty);

  return (
    <div
      className={cn("relative min-w-0", className)}
      // Opens on a tap or typing, not on focus: a dialog that focuses this box
      // first shouldn't cover the fields below it.
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
      onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
    >
      {children({
        id,
        value,
        className: "pr-8",
        "aria-expanded": expanded,
        "aria-controls": expanded ? listId : undefined,
        onChange: (e) => {
          setOpen(true);
          onChange(e.target.value);
        },
        onClick: () => setOpen(true),
      })}
      <button
        type="button"
        tabIndex={-1}
        aria-label={`Show ${listLabel.toLowerCase()}`}
        className="absolute inset-y-0 right-0 grid w-8 place-items-center text-muted-foreground hover:text-foreground"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          setOpen((o) => !o);
          document.getElementById(id)?.focus();
        }}
      >
        <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} aria-hidden="true" />
      </button>
      {expanded && (
        <ul
          id={listId}
          aria-label={listLabel}
          className="absolute top-full left-0 z-20 mt-1 max-h-60 w-max max-w-[calc(100vw-2rem)] min-w-full overflow-y-auto overscroll-contain rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {empty && <li className="px-2 py-2 text-sm text-muted-foreground">{emptyText}</li>}
          {shown.map((o) => {
            const chosen = normalize(o) === typed;
            return (
              <li key={o}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded px-2 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                    chosen && "bg-brand-soft font-semibold",
                  )}
                  onClick={() => {
                    onChange(o);
                    setOpen(false);
                  }}
                >
                  <span className="min-w-0 truncate">{o}</span>
                  {chosen && <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
