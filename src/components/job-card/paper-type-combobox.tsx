"use client";

import { useId, useState } from "react";
import { ChevronsUpDown, X } from "lucide-react";
import type { KnownPaperType } from "@/components/paper/paper-type-fields";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatSheets, paperTypeLabel } from "@/lib/paper";
import { cn } from "@/lib/utils";

/** Searchable picker of 3P paper types (`Category · GSM · Size`) with balances. */
export function PaperTypeCombobox({
  id,
  label,
  known,
  value,
  onChange,
  invalid,
}: {
  id?: string;
  label: string;
  known: KnownPaperType[];
  value: string;
  onChange: (id: string) => void;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const selected = known.find((k) => k.id === value);

  return (
    <div className="relative flex min-w-0 flex-1 items-center">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-label={selected ? `${label}: ${paperTypeLabel(selected)}` : label}
            aria-invalid={invalid || undefined}
            className={cn(
              "flex h-7 w-full min-w-0 items-center gap-1 rounded-[3px] border border-foreground/50 bg-background pr-1.5 pl-2 text-left text-sm outline-none transition-colors hover:border-primary focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30 aria-invalid:border-destructive",
              selected && "pr-7",
            )}
          >
            <span className={cn("min-w-0 flex-1 truncate", selected ? "font-semibold" : "text-muted-foreground")}>
              {selected ? paperTypeLabel(selected) : "Choose 3P paper…"}
            </span>
            {!selected && <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" aria-hidden="true" />}
          </button>
        </PopoverTrigger>
        <PopoverContent id={listId} className="w-80 max-w-[calc(100vw-2rem)] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search category, GSM or size…" />
            <CommandList>
              <CommandEmpty>
                No paper type found. Add it on Paper – 3P first.
              </CommandEmpty>
              <CommandGroup heading="3P paper types">
                {known.map((k) => (
                  <CommandItem
                    key={k.id}
                    value={`${paperTypeLabel(k)} ${k.category} ${k.gsm} ${k.size} ${k.id}`}
                    data-checked={k.id === value}
                    onSelect={() => {
                      onChange(k.id);
                      setOpen(false);
                    }}
                  >
                    <span className="font-medium">{paperTypeLabel(k)}</span>
                    <span
                      className={cn(
                        "ml-auto text-xs tabular-nums",
                        k.balance <= 0 ? "text-destructive" : "text-muted-foreground",
                      )}
                    >
                      {formatSheets(k.balance)} sheets
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected && (
        <button
          type="button"
          aria-label="Clear paper type"
          onClick={() => onChange("")}
          className="absolute right-1 grid size-5 place-items-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
