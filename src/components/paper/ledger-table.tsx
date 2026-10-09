import type { MovementType } from "@/generated/prisma/enums";
import { formatSheets } from "@/lib/paper";
import { cn } from "@/lib/utils";

export type LedgerTableRow = {
  id: string;
  dateBs: string;
  type: MovementType;
  particulars: string | null;
  jobNo: number | null;
  packets: number | null;
  sheets: number;
  balance: number;
  remarks: string | null;
};

const num = "px-3 py-2 text-right tabular-nums whitespace-nowrap";

/** Mirrors the paper binder page: Received / Used / Balance columns. */
export function LedgerTable({ rows }: { rows: LedgerTableRow[] }) {
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
              r.type === "ADJUSTMENT" && "bg-amber-50/60",
            )}
          >
            <div className="min-w-0">
              <div className="text-sm">{r.particulars ?? "—"}</div>
              <div className="text-xs text-muted-foreground tabular-nums">
                {r.dateBs}
                {r.jobNo !== null && ` · Job ${r.jobNo}`}
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
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr className="border-b">
              <th rowSpan={2} className="px-3 py-2 text-left font-medium">
                Date
              </th>
              <th rowSpan={2} className="px-3 py-2 text-left font-medium">
                Particulars
              </th>
              <th rowSpan={2} className="px-3 py-2 text-left font-medium">
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
              <th rowSpan={2} className="px-3 py-2 text-left font-medium">
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
              const isAdjustment = r.type === "ADJUSTMENT";
              return (
                <tr key={r.id} className={cn(isAdjustment && "bg-amber-50/60")}>
                  <td className="px-3 py-2 whitespace-nowrap tabular-nums">{r.dateBs}</td>
                  <td className="px-3 py-2">{r.particulars ?? "—"}</td>
                  <td className="px-3 py-2 tabular-nums">{r.jobNo ?? ""}</td>
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
                  <td className="px-3 py-2 text-muted-foreground">{r.remarks ?? ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
