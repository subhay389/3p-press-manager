"use client";

import { useMemo, useState } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_CATEGORIES,
  formatSheets,
  normalizeCategory,
  normalizeSize,
  paperTypeLabel,
} from "@/lib/paper";
import { cn } from "@/lib/utils";

export type KnownPaperType = {
  id: string;
  category: string;
  gsm: number;
  size: string;
  balance: number;
};

export type PaperTypeValue = { category: string; gsm: string; size: string };

/** Find the known type that matches the typed fields exactly, if any. */
export function matchPaperType(known: KnownPaperType[], v: PaperTypeValue) {
  const gsm = Number(v.gsm);
  if (!v.category.trim() || !v.size.trim() || !Number.isInteger(gsm) || gsm <= 0) return undefined;
  const category = normalizeCategory(v.category);
  const size = normalizeSize(v.size);
  return known.find((k) => k.category === category && k.gsm === gsm && k.size === size);
}

/**
 * Category / GSM / Size inputs with a live list of matching existing paper
 * types, and a clear notice when the combination is new.
 * `excludeId` hides the type being edited from matches.
 */
export function PaperTypeFields({
  known,
  value,
  onChange,
  excludeId,
  showStatus = true,
}: {
  known: KnownPaperType[];
  value: PaperTypeValue;
  onChange: (v: PaperTypeValue) => void;
  excludeId?: string;
  showStatus?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const others = useMemo(() => known.filter((k) => k.id !== excludeId), [known, excludeId]);

  const suggestions = useMemo(() => {
    const cat = normalizeCategory(value.category);
    const gsm = value.gsm.trim();
    const size = normalizeSize(value.size);
    if (!cat && !gsm && !size) return others.slice(0, 8);
    return others
      .filter(
        (k) =>
          (!cat || k.category.includes(cat)) &&
          (!gsm || String(k.gsm).startsWith(gsm)) &&
          (!size || k.size.includes(size)),
      )
      .slice(0, 8);
  }, [others, value]);

  const exact = matchPaperType(others, value);
  const complete =
    value.category.trim() !== "" && value.size.trim() !== "" && Number(value.gsm) > 0;
  const categories = useMemo(
    () => Array.from(new Set([...DEFAULT_CATEGORIES, ...known.map((k) => k.category)])),
    [known],
  );
  const newCategory =
    value.category.trim() !== "" && !categories.includes(normalizeCategory(value.category));

  return (
    <div
      className="grid gap-2"
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      <div className="grid grid-cols-[1.2fr_1fr_1.2fr] gap-2">
        <div className="grid gap-1.5">
          <Label htmlFor="pt-category">Category</Label>
          <Input
            id="pt-category"
            placeholder="A/B"
            list="pt-category-options"
            autoComplete="off"
            value={value.category}
            onChange={(e) => onChange({ ...value, category: e.target.value })}
            required
          />
          <datalist id="pt-category-options">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="pt-gsm">GSM</Label>
          <Input
            id="pt-gsm"
            inputMode="numeric"
            placeholder="250"
            autoComplete="off"
            value={value.gsm}
            onChange={(e) => onChange({ ...value, gsm: e.target.value.replace(/\D/g, "") })}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="pt-size">Size</Label>
          <Input
            id="pt-size"
            placeholder="24x36"
            autoComplete="off"
            value={value.size}
            onChange={(e) => onChange({ ...value, size: e.target.value })}
            required
          />
        </div>
      </div>

      {focused && !exact && suggestions.length > 0 && (
        <div className="rounded-lg border bg-popover p-1 shadow-sm">
          <p className="px-2 pt-1 pb-1.5 text-xs font-medium text-muted-foreground">
            Existing paper types
          </p>
          <ul className="max-h-44 overflow-y-auto">
            {suggestions.map((k) => (
              <li key={k.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  onClick={() =>
                    onChange({ category: k.category, gsm: String(k.gsm), size: k.size })
                  }
                >
                  <span className="font-medium">{paperTypeLabel(k)}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatSheets(k.balance)} sheets
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showStatus && complete && (
        <p
          role="status"
          className={cn(
            "flex items-start gap-1.5 rounded-md px-2.5 py-2 text-xs",
            exact ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900",
          )}
        >
          {exact ? (
            <>
              <CircleCheck className="mt-px size-3.5 shrink-0" aria-hidden="true" />
              <span>
                Existing paper type <strong>{paperTypeLabel(exact)}</strong> · balance{" "}
                {formatSheets(exact.balance)} sheets
              </span>
            </>
          ) : (
            <>
              <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
              <span>
                <strong>New paper type</strong>{" "}
                {paperTypeLabel({
                  category: normalizeCategory(value.category),
                  gsm: Number(value.gsm),
                  size: normalizeSize(value.size),
                })}{" "}
                will be added. Check for typos.
                {newCategory && " The category is also new."}
              </span>
            </>
          )}
        </p>
      )}
    </div>
  );
}
