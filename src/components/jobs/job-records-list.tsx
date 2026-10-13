"use client";

import { useMemo, useRef, useState, useTransition, type ComponentProps } from "react";
import Link from "next/link";
import {
  Check,
  CircleCheck,
  CircleX,
  Eye,
  MoreHorizontal,
  NotebookPen,
  Pencil,
  Printer,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { EditRecordDialog } from "@/components/jobs/edit-record-dialog";
import { StatusBadge } from "@/components/jobs/job-badges";
import { JobViewDialog } from "@/components/jobs/job-view-dialog";
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
import { JOB_STATUSES, type JobStatusValue } from "@/lib/jobs";
import { cn } from "@/lib/utils";
import type { JobListRow } from "@/server/job-data";
import { cancelJob, completeJob } from "@/server/jobs";

type Filter = JobStatusValue | "ALL";
type Open = { kind: "view" | "record" | "cancel"; job: JobListRow } | null;

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
  const [open, setOpen] = useState<Open>(() => {
    const job = initialViewId && rows.find((r) => r.id === initialViewId);
    return job ? { kind: "view", job } : null;
  });
  const [pending, startTransition] = useTransition();

  const searched = useMemo(() => rows.filter((r) => matches(r, query)), [rows, query]);
  const filtered = filter === "ALL" ? searched : searched.filter((r) => r.status === filter);
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

  const actions = (job: JobListRow) => (
    <RowActions
      job={job}
      isAdmin={isAdmin}
      disabled={pending}
      onView={() => setOpen({ kind: "view", job })}
      onRecord={() => setOpen({ kind: "record", job })}
      onComplete={() => run(() => completeJob(job.id))}
      onCancel={() => setOpen({ kind: "cancel", job })}
    />
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
            <table className="w-full min-w-[960px] text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr className="border-b">
                  <Th rowSpan={2}>Date</Th>
                  <Th rowSpan={2}>Client</Th>
                  <Th colSpan={2} className="border-l text-center">Job</Th>
                  <Th colSpan={3} className="border-l text-center">Binding</Th>
                  <Th colSpan={5} className="border-l text-center">Lamination</Th>
                  <Th rowSpan={2} className="border-l text-right whitespace-normal">
                    Required Qty
                  </Th>
                  <Th rowSpan={2} className="text-right">Delivery</Th>
                  <Th rowSpan={2}>Remarks</Th>
                  <Th rowSpan={2} className="border-l">Status</Th>
                  <Th rowSpan={2} className={cn(STICKY, "bg-[color-mix(in_oklab,var(--color-muted)_40%,var(--color-card))]")}>
                    <span className="sr-only">Actions</span>
                  </Th>
                </tr>
                <tr className="border-b">
                  <Sub className="border-l">Name</Sub>
                  <Sub>No.</Sub>
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
                    <Td className="max-w-36 truncate" title={r.client}>
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
                    <Td className="text-right tabular-nums">{r.deliveryQty}</Td>
                    <Td className="max-w-32 truncate" title={r.remarks ?? undefined}>
                      {r.remarks}
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
                  <span
                    className={cn(
                      "truncate font-medium",
                      r.status === "CANCELLED" && "line-through decoration-muted-foreground/60",
                    )}
                  >
                    {r.jobName}
                  </span>
                  <span className="truncate text-sm text-muted-foreground">{r.client}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    Required {r.qty ?? "—"} · Delivery {r.deliveryQty ?? "—"}
                    {r.remarks && ` · ${r.remarks}`}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    <StatusBadge status={r.status} />
                  </span>
                </button>
                <div className="shrink-0">{actions(r)}</div>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="text-xs text-muted-foreground">
        {filtered.length} of {rows.length} jobs
      </p>

      {open?.kind === "view" && (
        <JobViewDialog key={open.job.id} job={open.job} isAdmin={isAdmin} onClose={() => setOpen(null)} />
      )}
      {open?.kind === "record" && (
        <EditRecordDialog key={open.job.id} job={open.job} onClose={() => setOpen(null)} />
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
  onRecord,
  onComplete,
  onCancel,
}: {
  job: JobListRow;
  isAdmin: boolean;
  disabled: boolean;
  onView: () => void;
  onRecord: () => void;
  onComplete: () => void;
  onCancel: () => void;
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
        className="w-48"
        onCloseAutoFocus={(e) => {
          if (opensDialog.current) e.preventDefault();
          opensDialog.current = false;
        }}
      >
        <DropdownMenuItem onSelect={dialog(onView)}>
          <Eye /> View details
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={`/jobs/${job.id}/print`} target="_blank" rel="noopener">
            <Printer /> Print
          </a>
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
