"use client";

import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { nextSort, type Sort, type SortDir } from "@/lib/sort";
import { cn } from "@/lib/utils";

/** For `aria-sort` on the column's `<th>`. */
export function ariaSort<K extends string>(sort: Sort<K>, key: K) {
  if (sort.key !== key) return undefined;
  return sort.dir === "asc" ? "ascending" : "descending";
}

/** A column header that sorts the table when clicked. Put it inside the `<th>`. */
export function SortButton<K extends string>({
  sortKey,
  sort,
  onSort,
  className,
  children,
}: {
  sortKey: K;
  sort: Sort<K>;
  onSort: (sort: Sort<K>) => void;
  className?: string;
  children: ReactNode;
}) {
  const active = sort.key === sortKey;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={() => onSort(nextSort(sort, sortKey))}
      className={cn(
        "-mx-1 inline-flex items-center gap-1 rounded-sm px-1 text-[inherit] font-[inherit] outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
        active && "text-foreground",
        className,
      )}
    >
      {children}
      <Icon
        className={cn("size-3.5 shrink-0", active ? "text-primary" : "opacity-40")}
        strokeWidth={active ? 2.5 : 2}
        aria-hidden="true"
      />
    </button>
  );
}

export type SortColumn<K extends string> = { key: K; label: string; kind: "date" | "number" | "text" };

const DIR_LABEL: Record<SortColumn<string>["kind"], Record<SortDir, string>> = {
  date: { asc: "oldest first", desc: "newest first" },
  number: { asc: "lowest first", desc: "highest first" },
  text: { asc: "A to Z", desc: "Z to A" },
};

/** Phones show cards instead of the table, so they pick the sort from a list. */
export function SortSelect<K extends string>({
  columns,
  sort,
  onSort,
  className,
}: {
  columns: SortColumn<K>[];
  sort: Sort<K>;
  onSort: (sort: Sort<K>) => void;
  className?: string;
}) {
  const current = columns.find((c) => c.key === sort.key);
  return (
    <label className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
      <span className="shrink-0">Sort by</span>
      <Select
        value={`${sort.key}:${sort.dir}`}
        onValueChange={(v) => {
          const [key, dir] = v.split(":") as [K, SortDir];
          onSort({ key, dir });
        }}
      >
        <SelectTrigger className="w-full bg-card text-foreground">
          {/* Explicit text so it shows before hydration, when Radix doesn't know the items yet. */}
          <SelectValue>{current && `${current.label}, ${DIR_LABEL[current.kind][sort.dir]}`}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {columns.flatMap((c) => {
            const dirs: SortDir[] = c.kind === "text" ? ["asc", "desc"] : ["desc", "asc"];
            return dirs.map((dir) => (
              <SelectItem key={`${c.key}:${dir}`} value={`${c.key}:${dir}`}>
                {c.label}, {DIR_LABEL[c.kind][dir]}
              </SelectItem>
            ));
          })}
        </SelectContent>
      </Select>
    </label>
  );
}
