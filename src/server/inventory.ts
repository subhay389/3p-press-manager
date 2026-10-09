import "server-only";
import type { MovementType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

// All press stock logic lives here. Ledger rule: StockMovement rows are never
// updated or deleted; every change is a new row. Balance = SUM(sheets).

type Tx = Prisma.TransactionClient;

export async function balanceOf(paperTypeId: string, tx: Tx = db) {
  const agg = await tx.stockMovement.aggregate({
    where: { paperTypeId },
    _sum: { sheets: true },
  });
  return agg._sum.sheets ?? 0;
}

/** Every paper type with its current balance and last movement date. */
export async function listPaperStock() {
  const [types, sums] = await Promise.all([
    db.paperType.findMany({ orderBy: [{ category: "asc" }, { gsm: "asc" }, { size: "asc" }] }),
    db.stockMovement.groupBy({
      by: ["paperTypeId"],
      _sum: { sheets: true },
      _max: { date: true },
    }),
  ]);
  const byId = new Map(sums.map((s) => [s.paperTypeId, s]));
  return types.map((t) => ({
    id: t.id,
    category: t.category,
    gsm: t.gsm,
    size: t.size,
    balance: byId.get(t.id)?._sum.sheets ?? 0,
    lastDate: byId.get(t.id)?._max.date ?? null,
  }));
}

export type LedgerRow = {
  id: string;
  date: Date;
  type: MovementType;
  particulars: string | null;
  jobNo: number | null;
  jobId: string | null;
  packets: number | null;
  sheets: number;
  balance: number;
  remarks: string | null;
};

/** Ledger rows in binder order (oldest first) with a running balance. */
export async function getLedger(paperTypeId: string): Promise<LedgerRow[]> {
  const rows = await db.stockMovement.findMany({
    where: { paperTypeId },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    include: { job: { select: { jobNo: true } } },
  });
  let balance = 0;
  return rows.map((r) => {
    balance += r.sheets;
    return {
      id: r.id,
      date: r.date,
      type: r.type,
      particulars: r.particulars,
      jobNo: r.job?.jobNo ?? null,
      jobId: r.jobId,
      packets: r.packets,
      sheets: r.sheets,
      balance,
      remarks: r.remarks,
    };
  });
}

export async function recordReceipt(
  tx: Tx,
  data: {
    paperTypeId: string;
    date: Date;
    sheets: number;
    packets: number | null;
    particulars: string | null;
    remarks: string | null;
    createdByEmail: string;
  },
) {
  return tx.stockMovement.create({ data: { ...data, type: "RECEIPT" } });
}

/** Writes an ADJUSTMENT row so the balance becomes `newBalance`. */
export async function adjustToBalance(
  tx: Tx,
  data: { paperTypeId: string; date: Date; newBalance: number; reason: string; createdByEmail: string },
) {
  const current = await balanceOf(data.paperTypeId, tx);
  const diff = data.newBalance - current;
  if (diff === 0) return { diff, current };
  await tx.stockMovement.create({
    data: {
      paperTypeId: data.paperTypeId,
      date: data.date,
      type: "ADJUSTMENT",
      sheets: diff,
      particulars: `Stock adjustment: ${data.reason}`,
      createdByEmail: data.createdByEmail,
    },
  });
  return { diff, current };
}
