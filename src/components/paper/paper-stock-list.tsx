"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
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

function Balance({ value }: { value: number }) {
  return (
    <span className={cn("font-semibold tabular-nums", value < 0 && "text-destructive")}>
      {formatSheets(value)}
    </span>
  );
}

/** Paper – 3P, or Paper – Client with `showClient` (adds the Client column). */
export function PaperStockList({ rows, showClient = false }: { rows: PaperStockRow[]; showClient?: boolean }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => rows.filter((r) => matches(r, query)), [rows, query]);

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
                  {showClient && <TableHead className="w-[24%] pl-4">Client</TableHead>}
                  <TableHead className={cn(!showClient && "pl-4")}>Category</TableHead>
                  <TableHead>GSM</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Balance (sheets)</TableHead>
                  <TableHead>Last entry</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} className="group relative">
                    <TableCell className="truncate pl-4 font-medium">
                      <Link
                        href={paperHref(r)}
                        className="after:absolute after:inset-0 focus-visible:outline-none"
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
