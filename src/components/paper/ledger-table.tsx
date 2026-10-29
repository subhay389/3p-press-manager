"use client";

import { useState, type MouseEvent } from "react";
import { JobViewDialog } from "@/components/jobs/job-view-dialog";
import type { MovementType } from "@/generated/prisma/enums";
import { formatSheets } from "@/lib/paper";
import { cn } from "@/lib/utils";

export type LedgerTableRow = {
  id: string;
  dateBs: string;
  type: MovementType;
  particulars: string | null;
  jobNo: number | null;
  jobId: string | null;
  packets: number | null;
  sheets: number;
  balance: number;
  remarks: string | null;
};

const num = "px-3 py-2 text-right tabular-nums whitespace-nowrap";

/** Paper received (soft green) and stock adjustments (soft amber) stand out from job rows. */
const ROW_TINT: Partial<Record<MovementType, string>> = {
  RECEIPT: "bg-emerald-50/70",
  ADJUSTMENT: "bg-amber-50/60",
};

type OpenJob = (job: { id: string; jobNo: number }) => void;

/**
 * Mirrors the paper binder page: Received / Used / Balance columns. Job numbers
 * open the job's View details on top of the ledger. Paper – Client calls the
 * Particulars column "Job" (`particularsLabel`).
 */
export function LedgerTable({
  rows,
  isAdmin = false,
  particularsLabel = "Particulars",
}: {
  rows: LedgerTableRow[];
  isAdmin?: boolean;
  particularsLabel?: string;
}) {
  const [viewing, setViewing] = useState<{ id: string; jobNo: number } | null>(null);
  const dialog = viewing && (
    <JobViewDialog key={viewing.id} job={viewing} isAdmin={isAdmin} onClose={() => setViewing(null)} />
  );

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
        No entries yet.
      </p>
    );
  }

  return (
    <>
      {/* Phone: one compact row per entry */}
      <ul className="divide-y rounded-xl border bg-card md:hidden">
        {rows.map((r) => (
          <li
            key={r.id}
            className={cn(
              "flex items-start justify-between gap-3 px-4 py-3",
              ROW_TINT[r.type],
            )}
          >
            <div className="min-w-0">
              <div className="text-sm">{r.particulars ?? "—"}</div>
              <div className="text-xs text-muted-foreground tabular-nums">
                {r.dateBs}
                {r.jobNo !== null && (
                  <>
                    {" · Job "}
                    <JobLink row={r} onOpen={setViewing} />
                  </>
                )}
                {r.packets ? ` · ${r.packets}P` : ""}
                {r.remarks && ` · ${r.remarks}`}
              </div>
            </div>
            <div className="text-right tabular-nums">
              <div
                className={cn(
                  "text-sm font-medium",
                  r.sheets > 0 ? "text-emerald-700" : "text-foreground",
                )}
              >
                {r.sheets > 0 ? "+" : "−"}
                {formatSheets(Math.abs(r.sheets))}
              </div>
              <div
                className={cn("text-xs text-muted-foreground", r.balance < 0 && "text-destructive")}
              >
                bal. {formatSheets(r.balance)}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Laptop: binder layout */}
      <div className="hidden overflow-x-auto rounded-xl border bg-card md:block">
        <table className="col-lines w-full min-w-[760px] text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr className="border-b">
              <th rowSpan={2} className="px-3 py-2 text-left font-medium">
                Date
              </th>
              <th rowSpan={2} className="border-l px-3 py-2 text-left font-medium">
                {particularsLabel}
              </th>
              <th rowSpan={2} className="border-l px-3 py-2 text-left font-medium">
                Job No.
              </th>
              <th colSpan={2} className="border-l px-3 pt-2 text-center font-medium">
                Received
              </th>
              <th colSpan={2} className="border-l px-3 pt-2 text-center font-medium">
                Used
              </th>
              <th rowSpan={2} className="border-l px-3 py-2 text-right font-medium">
                Balance
              </th>
              <th rowSpan={2} className="border-l px-3 py-2 text-left font-medium">
                Remarks
              </th>
            </tr>
            <tr className="border-b">
              <th className="border-l px-3 pb-2 text-right font-normal">Pkts</th>
              <th className="px-3 pb-2 text-right font-normal">Sheets</th>
              <th className="border-l px-3 pb-2 text-right font-normal">Pkts</th>
              <th className="px-3 pb-2 text-right font-normal">Sheets</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => {
              const inward = r.sheets > 0;
              return (
                <tr key={r.id} className={cn("hover:bg-row-hover", ROW_TINT[r.type])}>
                  <td className="px-3 py-2 whitespace-nowrap tabular-nums">{r.dateBs}</td>
                  <td className="border-l px-3 py-2">{r.particulars ?? "—"}</td>
                  <td className="border-l px-3 py-2 tabular-nums">
                    <JobLink row={r} onOpen={setViewing} />
                  </td>
                  <td className={cn(num, "border-l")}>
                    {inward && r.packets ? `${r.packets}P` : ""}
                  </td>
                  <td className={num}>{inward ? formatSheets(r.sheets) : ""}</td>
                  <td className={cn(num, "border-l")}>
                    {!inward && r.packets ? `${r.packets}P` : ""}
                  </td>
                  <td className={num}>{!inward ? formatSheets(-r.sheets) : ""}</td>
                  <td
                    className={cn(
                      num,
                      "border-l font-semibold",
                      r.balance < 0 && "text-destructive",
                    )}
                  >
                    {formatSheets(r.balance)}
                  </td>
                  <td className="border-l px-3 py-2 text-muted-foreground">{r.remarks ?? ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {dialog}
    </>
  );
}

/**
 * Job rows open the job's card in a dialog. The link still points at Job
 * Records, so Ctrl/⌘-click or "open in new tab" works too.
 */
function JobLink({ row, onOpen }: { row: LedgerTableRow; onOpen: OpenJob }) {
  if (row.jobNo === null || !row.jobId) return null;
  const job = { id: row.jobId, jobNo: row.jobNo };
  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onOpen(job);
  }
  return (
    <a
      href={`/jobs?q=${row.jobNo}&view=${row.jobId}`}
      onClick={onClick}
      className="font-medium text-primary underline-offset-2 hover:underline"
    >
      {row.jobNo}
    </a>
  );
}
