"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Search } from "lucide-react";
import { ariaSort, SortButton, SortSelect, type SortColumn } from "@/components/sort-controls";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatSheets, normalizeSize, paperHref, paperTypeLabel } from "@/lib/paper";
import { sortRows, type Sort, type SortValue } from "@/lib/sort";
import { cn } from "@/lib/utils";

export type PaperStockRow = {
  id: string;
  client: string | null;
  clientKey: string;
  category: string;
  gsm: number;
  size: string;
  balance: number;
  lastDateBs: string | null;
};

function matches(row: PaperStockRow, query: string) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const haystack = `${row.client ?? ""} ${row.category} ${row.gsm} ${row.size} ${paperTypeLabel(row)}`.toLowerCase();
  return terms.every((t) => haystack.includes(t) || row.size.includes(normalizeSize(t)));
}

type SortKey = "client" | "category" | "gsm" | "size" | "balance" | "lastDate";

const SORT_COLUMNS: SortColumn<SortKey>[] = [
  { key: "client", label: "Client", kind: "text" },
  { key: "category", label: "Category", kind: "text" },
  { key: "gsm", label: "GSM", kind: "number" },
  { key: "size", label: "Size", kind: "text" },
  { key: "balance", label: "Balance", kind: "number" },
  { key: "lastDate", label: "Last entry", kind: "date" },
];

function sortValue(r: PaperStockRow, key: SortKey): SortValue {
  switch (key) {
    case "client":
      return r.client;
    case "category":
      return r.category;
    case "gsm":
      return r.gsm;
    case "size":
      return r.size;
    case "balance":
      return r.balance;
    case "lastDate":
      return r.lastDateBs;
  }
}

function Balance({ value }: { value: number }) {
  return (
    <span className={cn("font-semibold tabular-nums", value < 0 && "text-destructive")}>
      {formatSheets(value)}
    </span>
  );
}

/** Paper – 3P, or Paper – Client with `showClient` (adds the Client column). */
export function PaperStockList({ rows, showClient = false }: { rows: PaperStockRow[]; showClient?: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  // The server sends client, category, GSM, size order, so the first column starts sorted.
  const [sort, setSort] = useState<Sort<SortKey>>({ key: showClient ? "client" : "category", dir: "asc" });
  const filtered = useMemo(
    () => sortRows(rows.filter((r) => matches(r, query)), sort, sortValue),
    [rows, query, sort],
  );
  const head = (key: SortKey, label: string, className?: string) => (
    <TableHead className={className} aria-sort={ariaSort(sort, key)}>
      <SortButton sortKey={key} sort={sort} onSort={setSort}>
        {label}
      </SortButton>
    </TableHead>
  );

  return (
    <div className="grid gap-3">
      <div className="relative max-w-sm">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder={showClient ? "Search client, category, GSM or size" : "Search category, GSM or size"}
          aria-label="Search paper"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="bg-card pl-8"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          No paper matches “{query}”.
        </p>
      ) : (
        <>
          {/* Laptop: table */}
          <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
            {/* Fixed layout: the data columns share the width evenly, all left-aligned. */}
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  {showClient && head("client", "Client", "w-[24%] pl-4")}
                  {head("category", "Category", cn(!showClient && "pl-4"))}
                  {head("gsm", "GSM")}
                  {head("size", "Size")}
                  {head("balance", "Balance (sheets)")}
                  {head("lastDate", "Last entry")}
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  // The whole row opens the ledger. Not a stretched link: iOS Safari doesn't position
                  // against a <tr>, so every row's overlay covered the table and taps hit the last row.
                  <TableRow
                    key={r.id}
                    className="group cursor-pointer"
                    onClick={(e) => {
                      if (!(e.target as HTMLElement).closest("a")) router.push(paperHref(r));
                    }}
                  >
                    <TableCell className="truncate pl-4 font-medium">
                      <Link
                        href={paperHref(r)}
                        className="focus-visible:underline focus-visible:outline-none"
                        aria-label={`Open ledger for ${r.client ? `${r.client} ` : ""}${paperTypeLabel(r)}`}
                      >
                        {showClient ? r.client : r.category}
                      </Link>
                    </TableCell>
                    {showClient && <TableCell>{r.category}</TableCell>}
                    <TableCell className="tabular-nums">{r.gsm}</TableCell>
                    <TableCell>{r.size}</TableCell>
                    <TableCell>
                      <Balance value={r.balance} />
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {r.lastDateBs ?? "—"}
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Phone: cards */}
          <SortSelect
            columns={SORT_COLUMNS.filter((c) => showClient || c.key !== "client")}
            sort={sort}
            onSort={setSort}
            className="max-w-sm md:hidden"
          />
          <ul className="grid gap-2 md:hidden">
            {filtered.map((r) => (
              <li key={r.id}>
                <Link
                  href={paperHref(r)}
                  className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 active:bg-muted"
                >
                  <div className="min-w-0">
                    {showClient && <div className="truncate text-sm font-semibold text-navy">{r.client}</div>}
                    <div className="font-medium">{paperTypeLabel(r)}</div>
                    <div className="text-xs text-muted-foreground">
                      Last entry {r.lastDateBs ?? "—"}
                    </div>
                  </div>
                  <div className="text-right">
                    <Balance value={r.balance} />
                    <div className="text-xs text-muted-foreground">sheets</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="text-xs text-muted-foreground">
        {filtered.length} of {rows.length} {showClient ? "client papers" : "paper types"}
      </p>
    </div>
  );
}
