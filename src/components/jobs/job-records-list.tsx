"use client";

import { useCallback, useMemo, useRef, useState, useTransition, type ComponentProps, type ReactNode } from "react";
import Link from "next/link";
import {
  Camera,
  Check,
  CircleCheck,
  CircleX,
  Eye,
  MoreHorizontal,
  NotebookPen,
  Pencil,
  Printer,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { EditRecordDialog } from "@/components/jobs/edit-record-dialog";
import {
  InkCoverageDialog,
  InkCoveragePhotoDialog,
  InkCoverageThumb,
  RemoveInkCoverageDialog,
} from "@/components/jobs/ink-coverage";
import { StatusBadge } from "@/components/jobs/job-badges";
import { JobViewDialog } from "@/components/jobs/job-view-dialog";
import { PrintJob } from "@/components/jobs/print-job";
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
import { ariaSort, SortButton, SortSelect, type SortColumn } from "@/components/sort-controls";
import { JOB_STATUSES, type JobCardValues, type JobStatusValue } from "@/lib/jobs";
import { sortRows, type Sort, type SortValue } from "@/lib/sort";
import { cn } from "@/lib/utils";
import type { JobListRow } from "@/server/job-data";
import { cancelJob, completeJob, viewJob } from "@/server/jobs";

type Filter = JobStatusValue | "ALL";
type Open = { kind: "view" | "record" | "cancel" | "ink" | "ink-remove" | "ink-photo"; job: JobListRow } | null;

// Only the columns staff look jobs up by sort; the rest keep the table plain.
type SortKey = "date" | "client" | "jobName" | "jobNo";

// Same order as the server sends.
const DEFAULT_SORT: Sort<SortKey> = { key: "date", dir: "desc" };

const PHONE_SORT: SortColumn<SortKey>[] = [
  { key: "date", label: "Date", kind: "date" },
  { key: "jobNo", label: "Job No.", kind: "number" },
  { key: "client", label: "Client", kind: "text" },
  { key: "jobName", label: "Job Name", kind: "text" },
];

function sortValue(r: JobListRow, key: SortKey): SortValue {
  switch (key) {
    case "date":
      return [r.dateBs, r.jobNo];
    case "client":
      return r.client;
    case "jobName":
      return r.jobName;
    case "jobNo":
      return r.jobNo;
  }
}

function matches(row: JobListRow, query: string) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const haystack = `${row.jobNo} ${row.client} ${row.jobName}`.toLowerCase();
  return terms.every((t) => haystack.includes(t));
}

export function JobRecordsList({
  rows,
  isAdmin,
  initialQuery = "",
  initialViewId,
}: {
  rows: JobListRow[];
  isAdmin: boolean;
  initialQuery?: string;
  initialViewId?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [open, setOpen] = useState<Open>(() => {
    const job = initialViewId && rows.find((r) => r.id === initialViewId);
    return job ? { kind: "view", job } : null;
  });
  const [pending, startTransition] = useTransition();
  // The job being printed from the row menu; `run` remounts PrintJob for each Print.
  const [printing, setPrinting] = useState<{ run: number; values: JobCardValues } | null>(null);
  const clearPrinting = useCallback(() => setPrinting(null), []);

  const searched = useMemo(() => rows.filter((r) => matches(r, query)), [rows, query]);
  const filtered = useMemo(
    () => sortRows(filter === "ALL" ? searched : searched.filter((r) => r.status === filter), sort, sortValue),
    [searched, filter, sort],
  );
  const sortable = (key: SortKey, label: ReactNode) => (
    <SortButton sortKey={key} sort={sort} onSort={setSort}>
      {label}
    </SortButton>
  );
  const counts = useMemo(() => {
    const c: Record<Filter, number> = { ALL: searched.length, CREATED: 0, COMPLETED: 0, CANCELLED: 0 };
    for (const r of searched) c[r.status]++;
    return c;
  }, [searched]);

  function run(action: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) toast.success(result.message);
      else toast.error(result.error);
    });
  }

  function print(job: JobListRow) {
    startTransition(async () => {
      const data = await viewJob(job.id).catch(() => null);
      if (data) setPrinting((p) => ({ run: (p?.run ?? 0) + 1, values: data.values }));
      else toast.error("Couldn’t load this job. It may have been removed. Reload the page and try again.");
    });
  }

  const actions = (job: JobListRow) => (
    <RowActions
      job={job}
      isAdmin={isAdmin}
      disabled={pending}
      onView={() => setOpen({ kind: "view", job })}
      onPrint={() => print(job)}
      onRecord={() => setOpen({ kind: "record", job })}
      onComplete={() => run(() => completeJob(job.id))}
      onCancel={() => setOpen({ kind: "cancel", job })}
      onInk={() => setOpen({ kind: "ink", job })}
      onInkRemove={() => setOpen({ kind: "ink-remove", job })}
    />
  );

  const inkThumb = (job: JobListRow, className?: string) => (
    <InkCoverageThumb job={job} className={className} onOpenPhoto={() => setOpen({ kind: "ink-photo", job })} />
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3 *:min-w-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Search job no, client or job name"
            aria-label="Search jobs"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-card pl-8"
          />
        </div>
        <div
          role="radiogroup"
          aria-label="Filter by status"
          className="flex w-full overflow-x-auto rounded-lg border bg-card p-0.5 sm:w-auto"
        >
          {([{ value: "ALL", label: "All" }, ...JOB_STATUSES] as const).map((s) => (
            <button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={filter === s.value}
              onClick={() => setFilter(s.value)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-1 text-sm whitespace-nowrap sm:px-3 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:flex-none",
                filter === s.value
                  ? "bg-brand-soft font-medium text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
              <span className="text-xs tabular-nums opacity-70">{counts[s.value]}</span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          {query ? `No jobs match “${query}”` : "No jobs"}
          {filter !== "ALL" && ` with status ${JOB_STATUSES.find((s) => s.value === filter)!.label}`}.
        </p>
      ) : (
        <>
          {/* Laptop: binder layout */}
          <div className="relative hidden overflow-x-auto rounded-xl border bg-card lg:block">
            <table className="col-lines w-full min-w-[1020px] text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr className="border-b">
                  <Th rowSpan={2} aria-sort={ariaSort(sort, "date")}>
                    {sortable("date", "Date")}
                  </Th>
                  <Th rowSpan={2} className="border-l" aria-sort={ariaSort(sort, "client")}>
                    {sortable("client", "Client")}
                  </Th>
                  <Th colSpan={2} className="border-l text-center">Job</Th>
                  <Th colSpan={3} className="border-l text-center">Binding</Th>
                  <Th colSpan={5} className="border-l text-center">Lamination</Th>
                  <Th rowSpan={2} className="border-l text-right whitespace-normal">
                    Required Qty
                  </Th>
                  <Th rowSpan={2} className="border-l text-right">
                    Delivery
                  </Th>
                  <Th rowSpan={2} className="border-l">Remarks</Th>
                  <Th rowSpan={2} className="border-l text-center whitespace-normal">
                    Ink Coverage
                  </Th>
                  <Th rowSpan={2} className="border-l">
                    Status
                  </Th>
                  <Th rowSpan={2} className={cn(STICKY, "bg-[color-mix(in_oklab,var(--color-muted)_40%,var(--color-card))]")}>
                    <span className="sr-only">Actions</span>
                  </Th>
                </tr>
                <tr className="border-b">
                  <Sub className="border-l" aria-sort={ariaSort(sort, "jobName")}>
                    {sortable("jobName", "Name")}
                  </Sub>
                  <Sub aria-sort={ariaSort(sort, "jobNo")}>{sortable("jobNo", "No.")}</Sub>
                  <Sub className="border-l">Col.</Sub>
                  <Sub>Stitching</Sub>
                  <Sub>Folding</Sub>
                  <Sub className="border-l">Matt</Sub>
                  <Sub>Gloss</Sub>
                  <Sub>B-Side</Sub>
                  <Sub>Qty</Sub>
                  <Sub>Size</Sub>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    onClick={(e) => {
                      // The whole row opens View details, except clicks on its buttons and
                      // menus (incl. portalled menu items, which aren't inside the row's DOM)
                      // and text selection.
                      const target = e.target as Element;
                      if (!e.currentTarget.contains(target) || target.closest("button, a, input")) return;
                      if (window.getSelection()?.toString()) return;
                      setOpen({ kind: "view", job: r });
                    }}
                    className={cn(
                      "group/row cursor-pointer hover:bg-row-hover",
                      r.status === "CANCELLED" && "text-muted-foreground",
                    )}
                  >
                    <Td className="tabular-nums whitespace-nowrap">{r.dateBs}</Td>
                    <Td className="max-w-36 truncate border-l" title={r.client}>
                      {r.client}
                    </Td>
                    <Td className="max-w-52 border-l">
                      <button
                        type="button"
                        onClick={() => setOpen({ kind: "view", job: r })}
                        className={cn(
                          "block max-w-full truncate text-left font-medium hover:text-primary hover:underline focus-visible:text-primary focus-visible:outline-none",
                          r.status === "CANCELLED" && "line-through decoration-muted-foreground/60",
                        )}
                        title={`View job ${r.jobNo}: ${r.jobName}`}
                      >
                        {r.jobName}
                      </button>
                    </Td>
                    <Td className="font-semibold tabular-nums">{r.jobNo}</Td>
                    <Td className="border-l text-center">
                      <Tick on={r.recCol} label="Col." />
                    </Td>
                    <Td className="text-center">{r.recStitching}</Td>
                    <Td className="text-center">{r.recFolding}</Td>
                    <Td className="border-l text-center">
                      <Tick on={r.lamination === "MATT"} label="Matt" />
                    </Td>
                    <Td className="text-center">
                      <Tick on={r.lamination === "GLOSS"} label="Gloss" />
                    </Td>
                    <Td className="text-center">
                      <Tick on={r.laminationBSide} label="B-Side" />
                    </Td>
                    <Td className="text-center">{r.recLamQty}</Td>
                    <Td className="text-center">{r.recLamSize}</Td>
                    <Td className="border-l text-right tabular-nums">{r.qty ?? ""}</Td>
                    <Td className="border-l text-right tabular-nums">{r.deliveryQty}</Td>
                    <Td className="max-w-32 truncate border-l" title={r.remarks ?? undefined}>
                      {r.remarks}
                    </Td>
                    <Td className="border-l py-1.5">
                      <div className="flex justify-center">{inkThumb(r)}</div>
                    </Td>
                    <Td className="border-l">
                      <StatusBadge status={r.status} />
                    </Td>
                    <Td className={cn(STICKY, "py-1.5 pr-2 group-hover/row:bg-row-hover")}>{actions(r)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phone and tablet: cards */}
          <SortSelect columns={PHONE_SORT} sort={sort} onSort={setSort} className="sm:max-w-sm lg:hidden" />
          <ul className="grid gap-2 lg:hidden">
            {filtered.map((r) => (
              <li
                key={r.id}
                className={cn(
                  "flex gap-2 rounded-xl border bg-card py-3 pr-2 pl-4",
                  r.status === "CANCELLED" && "text-muted-foreground",
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpen({ kind: "view", job: r })}
                  className="grid min-w-0 flex-1 gap-1 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="flex items-baseline gap-2 text-xs tabular-nums">
                    <span className="font-semibold text-foreground">Job {r.jobNo}</span>
                    <span className="text-muted-foreground">{r.dateBs}</span>
                  </span>
                  <span className="truncate">
                    <span className="text-sm text-muted-foreground">Job Name: </span>
                    <span
                      className={cn(
                        "font-medium",
                        r.status === "CANCELLED" && "line-through decoration-muted-foreground/60",
                      )}
                    >
                      {r.jobName}
                    </span>
                  </span>
                  <span className="truncate text-sm">
                    <span className="text-muted-foreground">Client: </span>
                    {r.client}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    Required {r.qty ?? "—"} · Delivery {r.deliveryQty ?? "—"}
                    {r.remarks && ` · ${r.remarks}`}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    <StatusBadge status={r.status} />
                  </span>
                </button>
                {r.inkCoverage && <div className="shrink-0 self-center">{inkThumb(r, "size-12")}</div>}
                <div className="shrink-0">{actions(r)}</div>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="text-xs text-muted-foreground">
        {filtered.length} of {rows.length} jobs
      </p>

      {printing && <PrintJob key={printing.run} values={printing.values} onDone={clearPrinting} />}
      {open?.kind === "view" && (
        <JobViewDialog key={open.job.id} job={open.job} isAdmin={isAdmin} onClose={() => setOpen(null)} />
      )}
      {open?.kind === "record" && (
        <EditRecordDialog key={open.job.id} job={open.job} onClose={() => setOpen(null)} />
      )}
      {open?.kind === "ink" && (
        <InkCoverageDialog key={open.job.id} job={open.job} onClose={() => setOpen(null)} />
      )}
      {open?.kind === "ink-remove" && (
        <RemoveInkCoverageDialog key={open.job.id} job={open.job} onClose={() => setOpen(null)} />
      )}
      {open?.kind === "ink-photo" && (
        <InkCoveragePhotoDialog key={open.job.id} job={open.job} onClose={() => setOpen(null)} />
      )}
      <AlertDialog open={open?.kind === "cancel"} onOpenChange={(o) => !o && setOpen(null)}>
        {open?.kind === "cancel" && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel job {open.job.jobNo}?</AlertDialogTitle>
              <AlertDialogDescription>
                {open.job.jobName} for {open.job.client} stays in Job Records as Cancelled.
                {open.job.paperStock === "PRESS"
                  ? " The 3P paper it used goes back into stock."
                  : ` The paper it used goes back to ${open.job.client}’s stock.`}{" "}
                A cancelled job can’t be reopened or edited.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep job</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  const job = open.job;
                  run(() => cancelJob(job.id));
                }}
              >
                Cancel job
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </div>
  );
}

// Actions stay in view while the wide binder table scrolls sideways.
const STICKY = "sticky right-0 w-10 border-l-0 bg-card shadow-[-1px_0_0_var(--color-border)]";

function Th({ className, ...props }: ComponentProps<"th">) {
  return <th className={cn("px-2 py-2 text-left font-medium whitespace-nowrap first:pl-3", className)} {...props} />;
}

function Sub({ className, ...props }: ComponentProps<"th">) {
  return <th className={cn("px-2 pb-2 text-center font-normal whitespace-nowrap", className)} {...props} />;
}

function Td({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("px-2 py-2.5 align-top first:pl-3", className)} {...props} />;
}

function Tick({ on, label }: { on: boolean; label: string }) {
  if (!on) return null;
  return (
    <Check className="mx-auto size-4 text-primary" strokeWidth={3} role="img" aria-label={`${label} ticked`} />
  );
}

function RowActions({
  job,
  isAdmin,
  disabled,
  onView,
  onPrint,
  onRecord,
  onComplete,
  onCancel,
  onInk,
  onInkRemove,
}: {
  job: JobListRow;
  isAdmin: boolean;
  disabled: boolean;
  onView: () => void;
  onPrint: () => void;
  onRecord: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onInk: () => void;
  onInkRemove: () => void;
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
        <Button variant="ghost" size="icon" aria-label={`Actions for job ${job.jobNo}`} disabled={disabled}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-52"
        onCloseAutoFocus={(e) => {
          if (opensDialog.current) e.preventDefault();
          opensDialog.current = false;
        }}
      >
        <DropdownMenuItem onSelect={dialog(onView)}>
          <Eye /> View details
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onPrint}>
          <Printer /> Print
        </DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            {job.status !== "CANCELLED" && (
              <DropdownMenuItem asChild>
                <Link href={`/jobs/${job.id}/edit`}>
                  <Pencil /> Edit job
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={dialog(onRecord)}>
              <NotebookPen /> Edit record
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={dialog(onInk)}>
              <Camera /> {job.inkCoverage ? "Replace" : "Add"} Ink Coverage
            </DropdownMenuItem>
            {job.inkCoverage && (
              <DropdownMenuItem onSelect={dialog(onInkRemove)}>
                <Trash2 /> Remove Ink Coverage
              </DropdownMenuItem>
            )}
            {job.status === "CREATED" && (
              <DropdownMenuItem onSelect={onComplete}>
                <CircleCheck /> Mark completed
              </DropdownMenuItem>
            )}
            {job.status !== "CANCELLED" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={dialog(onCancel)}>
                  <CircleX /> Cancel job
                </DropdownMenuItem>
              </>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
