"use client";

import { createContext, useContext, type ComponentProps, type ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Small pieces that copy the look of the paper Job Card Sheet: dotted write-in
// lines, bordered option boxes, magenta bands. In "view"/"print" mode the
// inputs are read-only.

export type JobCardMode = "form" | "view" | "print";

const ModeContext = createContext<JobCardMode>("form");
export const JobCardModeProvider = ModeContext.Provider;
export function useReadOnly() {
  return useContext(ModeContext) !== "form";
}

/** Label printed on the card, e.g. "Client:". */
export function CardLabel({
  htmlFor,
  children,
  className,
}: {
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={cn("shrink-0 text-sm font-medium text-foreground", className)}>
      {children}
    </label>
  );
}

/** Write-in line, like the dotted lines on the card. */
export function LineInput({ className, ...props }: ComponentProps<"input">) {
  const readOnly = useReadOnly();
  if (readOnly) {
    // Read-only text wraps instead of being cut off at the line's width.
    return (
      <span
        id={props.id}
        className={cn(
          "block min-h-8 w-full min-w-0 border-b border-dashed border-foreground/35 px-1 pt-1.5 pb-1 text-base break-words text-foreground md:text-sm",
          className,
        )}
      >
        {props.value}
      </span>
    );
  }
  return (
    <input
      autoComplete="off"
      readOnly={readOnly}
      {...props}
      placeholder={readOnly ? undefined : props.placeholder}
      className={cn(
        "h-8 w-full min-w-0 border-0 border-b border-dashed border-foreground/35 bg-transparent px-1 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-solid focus:border-primary aria-invalid:border-solid aria-invalid:border-destructive md:text-sm",
        readOnly && "cursor-default",
        className,
      )}
    />
  );
}

/** Small bordered write-in box (GSM, Front Color, tally cells…). */
export function BoxInput({ className, ...props }: ComponentProps<"input">) {
  const readOnly = useReadOnly();
  return (
    <input
      autoComplete="off"
      readOnly={readOnly}
      {...props}
      placeholder={readOnly ? undefined : props.placeholder}
      className={cn(
        "h-7 min-w-0 rounded-[3px] border border-foreground/50 bg-background px-1.5 text-center text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-ring/30 aria-invalid:border-destructive md:text-sm",
        readOnly && "cursor-default",
        className,
      )}
    />
  );
}

/** Keeps only digits, for number fields typed on phones. */
export function digits(v: string) {
  return v.replace(/\D/g, "");
}

/**
 * Row of checkbox-style option boxes. One choice; clicking the chosen box
 * again clears it unless `required`.
 */
export function OptionBoxes<T extends string>({
  label,
  options,
  value,
  onChange,
  required,
  disabled,
  className,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T | "";
  onChange: (v: T | "") => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const readOnly = useReadOnly() || disabled;
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex flex-wrap gap-1", className)}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={readOnly}
            onClick={() => onChange(selected && !required ? "" : o.value)}
            className={cn(
              "h-7 min-w-9 rounded-[3px] border px-1.5 text-xs font-semibold tracking-wide transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-foreground/50 bg-background text-foreground hover:border-primary hover:bg-brand-soft",
              readOnly && "pointer-events-none",
              readOnly && !selected && "text-foreground/70",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** A single tick box, like the square boxes on the card. */
export function TickBox({
  id,
  checked,
  onChange,
}: {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const readOnly = useReadOnly();
  return (
    <button
      id={id}
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={readOnly}
      onClick={() => onChange(!checked)}
      className={cn(
        "grid size-6 shrink-0 place-items-center rounded-[3px] border transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        checked
          ? "border-primary bg-primary text-primary-foreground"
          : "border-foreground/50 bg-background hover:border-primary hover:bg-brand-soft",
        readOnly && "pointer-events-none",
      )}
    >
      {checked && <Check className="size-4" strokeWidth={3} aria-hidden="true" />}
    </button>
  );
}

/** Folding "1/2/4/8/16" printed choices; the chosen number gets circled, like on paper. */
export function FoldingChoice({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly number[];
  value: string;
  onChange: (v: string) => void;
}) {
  const readOnly = useReadOnly();
  return (
    <div role="radiogroup" aria-label={label} className="flex items-center text-sm">
      {options.map((f, i) => {
        const selected = String(f) === value;
        return (
          <span key={f} className="flex items-center">
            {i > 0 && <span className="px-px text-foreground/50">/</span>}
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={readOnly}
              onClick={() => onChange(selected ? "" : String(f))}
              className={cn(
                "grid size-6.5 place-items-center rounded-full font-medium tabular-nums transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                selected
                  ? "bg-brand-soft font-semibold text-primary ring-2 ring-primary"
                  : "hover:bg-brand-soft hover:text-primary",
                readOnly && "pointer-events-none",
              )}
            >
              {f}
            </button>
          </span>
        );
      })}
    </div>
  );
}

/** Solid magenta strip, as across the top and middle of the card. */
export function Band({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <div className={cn("bg-primary text-primary-foreground print:[print-color-adjust:exact]", className)}>
      {children}
    </div>
  );
}
