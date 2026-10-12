import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AddPaperDialog } from "@/components/paper/add-paper-dialog";
import { AdjustStockDialog } from "@/components/paper/adjust-stock-dialog";
import { EditPaperTypeDialog } from "@/components/paper/edit-paper-type-dialog";
import { LedgerTable } from "@/components/paper/ledger-table";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatBs, todayBs } from "@/lib/nepali-date";
import { formatSheets, paperTypeLabel } from "@/lib/paper";
import { cn } from "@/lib/utils";
import { getLedger, listPaperStock } from "@/server/inventory";

type Owner = "press" | "client";

export async function paperLedgerMetadata(id: string): Promise<Metadata> {
  const type = await db.paperType.findUnique({ where: { id } });
  if (!type) return { title: "Paper" };
  return { title: `${type.client ? `${type.client}: ` : ""}${paperTypeLabel(type)}` };
}

/** Ledger page of one paper stock, for Paper – 3P and Paper – Client. */
export async function PaperLedger({ id, owner }: { id: string; owner: Owner }) {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";

  const [stock, ledger] = await Promise.all([listPaperStock(owner), getLedger(id)]);
  const type = stock.find((s) => s.id === id);
  if (!type) notFound();
  const known = stock.map(({ id, client, clientKey, category, gsm, size, balance }) => ({
    id,
    client,
    clientKey,
    category,
    gsm,
    size,
    balance,
  }));
  const self = known.find((k) => k.id === id)!;
  const today = todayBs();

  return (
    <>
      <Link
        href={`/paper/${owner}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {owner === "client" ? "All client paper" : "All paper"}
      </Link>

      <div className="mb-6 flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="grid gap-3">
          {type.client && (
            <p className="text-sm">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Client
              </span>{" "}
              <span className="ml-1 text-lg font-semibold text-navy">{type.client}</span>
            </p>
          )}
          <dl className="grid grid-cols-3 gap-x-6 gap-y-1 sm:flex sm:gap-8">
            {[
              ["Category", type.category],
              ["GSM", String(type.gsm)],
              ["Size", type.size],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {label}
                </dt>
                <dd className="text-xl font-semibold text-navy">{value}</dd>
              </div>
            ))}
            <div className="col-span-3 mt-2 sm:mt-0 sm:border-l sm:pl-8">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Balance
              </dt>
              <dd
                className={cn(
                  "text-xl font-semibold tabular-nums",
                  type.balance < 0 ? "text-destructive" : "text-primary",
                )}
              >
                {formatSheets(type.balance)} <span className="text-sm font-normal">sheets</span>
              </dd>
            </div>
          </dl>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <AddPaperDialog known={known} today={today} fixedType={self} />
            <AdjustStockDialog paperTypeId={id} balance={type.balance} today={today} />
            <EditPaperTypeDialog paperType={self} known={known} />
          </div>
        )}
      </div>

      <LedgerTable
        isAdmin={isAdmin}
        particularsLabel={owner === "client" ? "Job" : "Particulars"}
        rows={ledger.map((r) => ({
          id: r.id,
          dateBs: formatBs(r.date),
          type: r.type,
          particulars: r.particulars,
          jobNo: r.jobNo,
          jobId: r.jobId,
          packets: r.packets,
          sheets: r.sheets,
          balance: r.balance,
          remarks: r.remarks,
        }))}
      />
    </>
  );
}
