"use client";

import { Input } from "@/components/ui/input";
import { formatAd, parseBs } from "@/lib/nepali-date";

/**
 * BS date as text "YYYY/MM/DD" (UNKNOWN U12: may become a calendar picker).
 * Shows the AD equivalent underneath, or an error once the value is complete.
 */
export function BsDateInput({
  id,
  value,
  onChange,
  required,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const parsed = value.trim() ? parseBs(value) : null;
  const looksComplete = /^\d{4}[/-]\d{1,2}[/-]\d{1,2}$/.test(value.trim());
  const invalid = looksComplete && !parsed;

  return (
    <div className="grid gap-1">
      <Input
        id={id}
        inputMode="numeric"
        placeholder="YYYY/MM/DD"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid || undefined}
        required={required}
        autoComplete="off"
      />
      <p className={invalid ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
        {invalid ? "Not a valid BS date" : parsed ? `= ${formatAd(parsed)}` : "BS date"}
      </p>
    </div>
  );
}
