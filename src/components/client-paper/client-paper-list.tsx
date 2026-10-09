"use client";

import { useMemo, useRef, useState, useTransition, type ComponentProps } from "react";
import { MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ClientPaperDialog, type ClientPaperRow } from "@/components/client-paper/client-paper-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { clientBalanceSheets, formatSheets } from "@/lib/paper";
import { cn } from "@/lib/utils";
import { deleteClientPaper } from "@/server/client-paper";

type Open = { kind: "edit" | "delete"; row: ClientPaperRow } | null;

function matches(row: ClientPaperRow, query: string) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const haystack = `${row.client} ${row.cutJob ?? ""} ${row.cutJobNo ?? ""}`.toLowerCase();
  return terms.every((t) => haystack.includes(t));
}

const n = (v: number | null) => (v === null ? "" : formatSheets(v));

function paperLabel(r: ClientPaperRow) {
  return [r.category, r.gsm, r.size].filter((p) => p !== null && p !== "").join(" · ");
}

/** Balance Sheets, with "—" for nothing left, as in the binder. */
function BalanceSheets({ row }: { row: ClientPaperRow }) {
  const balance = clientBalanceSheets(row.sheets, row.cutSheets);
  if (balance === null) return null;
  if (balance === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={cn("tabular-nums", balance < 0 && "text-destructive")}>{formatSheets(balance)}</span>
  );
}

/** "Add paper" for the page header. */
export function AddClientPaperButton({ today }: { today: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus /> Add paper
      </Button>
      {open && <ClientPaperDialog today={today} onClose={() => setOpen(false)} />}
    </>
  );
}

export function ClientPaperList({
  rows,
  isAdmin,
  today,
}: {
  rows: ClientPaperRow[];
  isAdmin: boolean;
  today: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Open>(null);
  const [pending, startTransition] = useTransition();
  const filtered = useMemo(() => rows.filter((r) => matches(r, query)), [rows, query]);

  function remove(row: ClientPaperRow) {
    startTransition(async () => {
      const result = await deleteClientPaper(row.id);
      if (result.ok) toast.success(result.message);
      else toast.error(result.error);
    });
  }

  const actions = (row: ClientPaperRow) => (
    <RowActions
      row={row}
      disabled={pending}
      onEdit={() => setOpen({ kind: "edit", row })}
      onDelete={() => setOpen({ kind: "delete", row })}
    />
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3 *:min-w-0">
      <div className="relative w-full sm:max-w-sm">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder="Search client, job or job no"
          aria-label="Search client paper"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="bg-card pl-8"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          No client paper matches “{query}”.
        </p>
      ) : (
        <>
          {/* Laptop: binder layout */}
          <div className="relative hidden overflow-x-auto rounded-xl border bg-card lg:block">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr className="border-b">
                  <Th rowSpan={2}>Date</Th>
                  <Th rowSpan={2}>Client</Th>
                  <Th colSpan={5} className="border-l text-center">Paper</Th>
                  <Th colSpan={4} className="border-l text-center">Cutting</Th>
                  <Th colSpan={2} className="border-l text-center">Balance</Th>
                  <Th rowSpan={2} className="border-l">Remarks</Th>
                  {isAdmin && (
                    <Th
                      rowSpan={2}
                      className={cn(STICKY, "bg-[color-mix(in_oklab,var(--color-muted)_40%,var(--color-card))]")}
                    >
                      <span className="sr-only">Actions</span>
                    </Th>
                  )}
                </tr>
                <tr className="border-b">
                  <Sub className="border-l">GSM</Sub>
                  <Sub>Category</Sub>
                  <Sub>Size</Sub>
                  <Sub>Pkts</Sub>
                  <Sub>Sheets</Sub>
                  <Sub className="border-l">Job</Sub>
                  <Sub>Job No.</Sub>
                  <Sub>Pkts</Sub>
                  <Sub>Sheets</Sub>
                  <Sub className="border-l">Pkts</Sub>
                  <Sub>Sheets</Sub>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <Td className="tabular-nums whitespace-nowrap">{r.dateBs}</Td>
                    <Td className="max-w-40 truncate font-medium" title={r.client}>
                      {r.client}
                    </Td>
                    <Td className="border-l text-right tabular-nums">{r.gsm ?? ""}</Td>
                    <Td>{r.category}</Td>
                    <Td>{r.size}</Td>
                    <Td className="text-right tabular-nums">{n(r.packets)}</Td>
                    <Td className="text-right tabular-nums">{n(r.sheets)}</Td>
                    <Td className="max-w-48 truncate border-l" title={r.cutJob ?? undefined}>
                      {r.cutJob}
                    </Td>
                    <Td className="tabular-nums whitespace-nowrap">{r.cutJobNo}</Td>
                    <Td className="text-right tabular-nums">{n(r.cutPackets)}</Td>
                    <Td className="text-right tabular-nums">{n(r.cutSheets)}</Td>
                    <Td className="border-l text-right tabular-nums">{n(r.balancePackets)}</Td>
                    <Td className="text-right font-semibold">
                      <BalanceSheets row={r} />
                    </Td>
                    <Td className="max-w-40 truncate border-l" title={r.remarks ?? undefined}>
                      {r.remarks}
                    </Td>
                    {isAdmin && <Td className={cn(STICKY, "py-1.5 pr-2")}>{actions(r)}</Td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phone and tablet: cards */}
          <ul className="grid gap-2 lg:hidden">
            {filtered.map((r) => {
              const paper = paperLabel(r);
              return (
                <li key={r.id} className="flex gap-2 rounded-xl border bg-card py-3 pr-2 pl-4">
                  <div className="grid min-w-0 flex-1 gap-1">
                    <span className="flex items-baseline gap-2 text-xs text-muted-foreground tabular-nums">
                      {r.dateBs}
                      {paper && <span className="truncate">{paper}</span>}
                    </span>
                    <span className="truncate font-medium">{r.client}</span>
                    <dl className="mt-1 grid grid-cols-3 gap-2 text-xs">
                      <Stat label="Received" pkts={r.packets} sheets={r.sheets} />
                      <Stat label="Cut" pkts={r.cutPackets} sheets={r.cutSheets} />
                      <div>
                        <dt className="text-muted-foreground">Balance</dt>
                        <dd className="font-semibold">
                          <BalanceSheets row={r} />
                          {r.balancePackets !== null && (
                            <span className="font-normal text-muted-foreground"> · {r.balancePackets}P</span>
                          )}
                        </dd>
                      </div>
                    </dl>
                    {(r.cutJob || r.cutJobNo) && (
                      <span className="truncate text-xs text-muted-foreground">
                        Cut for {r.cutJob ?? "job"}
                        {r.cutJobNo && ` · Job ${r.cutJobNo}`}
                      </span>
                    )}
                    {r.remarks && <span className="truncate text-xs text-muted-foreground">{r.remarks}</span>}
                  </div>
                  {isAdmin && <div className="shrink-0">{actions(r)}</div>}
                </li>
              );
            })}
          </ul>
        </>
      )}
      <p className="text-xs text-muted-foreground">
        {filtered.length} of {rows.length} entries
      </p>

      {open?.kind === "edit" && (
        <ClientPaperDialog key={open.row.id} row={open.row} today={today} onClose={() => setOpen(null)} />
      )}
      <AlertDialog open={open?.kind === "delete"} onOpenChange={(o) => !o && setOpen(null)}>
        {open?.kind === "delete" && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
              <AlertDialogDescription>
                {open.row.dateBs} · {open.row.client}
                {paperLabel(open.row) && ` · ${paperLabel(open.row)}`}. The row is removed from Paper –
                Client for good. 3P stock is not affected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep entry</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  const row = open.row;
                  remove(row);
                }}
              >
                Delete entry
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </div>
  );
}

function Stat({ label, pkts, sheets }: { label: string; pkts: number | null; sheets: number | null }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">
        {sheets === null ? "—" : formatSheets(sheets)}
        {pkts !== null && <span className="text-muted-foreground"> · {pkts}P</span>}
      </dd>
    </div>
  );
}

// Actions stay in view while the wide binder table scrolls sideways.
const STICKY = "sticky right-0 w-10 bg-card shadow-[-1px_0_0_var(--color-border)]";

function Th({ className, ...props }: ComponentProps<"th">) {
  return <th className={cn("px-2 py-2 text-left font-medium whitespace-nowrap first:pl-3", className)} {...props} />;
}

function Sub({ className, ...props }: ComponentProps<"th">) {
  return <th className={cn("px-2 pb-2 text-center font-normal whitespace-nowrap", className)} {...props} />;
}

function Td({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("px-2 py-2.5 align-top first:pl-3", className)} {...props} />;
}

function RowActions({
  row,
  disabled,
  onEdit,
  onDelete,
}: {
  row: ClientPaperRow;
  disabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  // When an item opens a dialog, don't move focus back to the trigger: the
  // dialog would take that as an outside interaction and close at once.
  const opensDialog = useRef(false);
  const dialog = (open: () => void) => () => {
    opensDialog.current = true;
    open();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Actions for ${row.client}, ${row.dateBs}`}
          disabled={disabled}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-40"
        onCloseAutoFocus={(e) => {
          if (opensDialog.current) e.preventDefault();
          opensDialog.current = false;
        }}
      >
        <DropdownMenuItem onSelect={dialog(onEdit)}>
          <Pencil /> Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={dialog(onDelete)}>
          <Trash2 /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
