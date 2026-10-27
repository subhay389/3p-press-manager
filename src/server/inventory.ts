import "server-only";
import { revalidatePath } from "next/cache";
import type { MovementType } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { paperCorrections, sheetsByPaperType } from "@/lib/jobs";
import { formatSheets, paperTypeLabel } from "@/lib/paper";

// All paper stock logic (3P and client paper) lives here. Ledger rule: StockMovement rows are never
// updated or deleted; every change is a new row. Balance = SUM(sheets).

type Tx = Prisma.TransactionClient;

/** Every paper list and ledger page (3P and client); any stock change can show on them. */
export function revalidatePaperPages() {
  revalidatePath("/paper/press");
  revalidatePath("/paper/client");
  revalidatePath("/paper/press/[id]", "page");
  revalidatePath("/paper/client/[id]", "page");
}

export async function balanceOf(paperTypeId: string, tx: Tx = db) {
  const agg = await tx.stockMovement.aggregate({
    where: { paperTypeId },
    _sum: { sheets: true },
  });
  return agg._sum.sheets ?? 0;
}

/**
 * Paper stocks with their current balance and last movement date: 3P stock
 * (`press`), client paper (`client`) or both.
 */
export async function listPaperStock(owner?: "press" | "client") {
  const [types, sums] = await Promise.all([
    db.paperType.findMany({
      where: owner === "press" ? { clientKey: "" } : owner === "client" ? { clientKey: { not: "" } } : {},
      orderBy: [{ clientKey: "asc" }, { category: "asc" }, { gsm: "asc" }, { size: "asc" }],
    }),
    db.stockMovement.groupBy({
      by: ["paperTypeId"],
      _sum: { sheets: true },
      _max: { date: true },
    }),
  ]);
  const byId = new Map(sums.map((s) => [s.paperTypeId, s]));
  return types.map((t) => ({
    id: t.id,
    client: t.client,
    clientKey: t.clientKey,
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

/**
 * Blocks a job save when a paper stock can't cover the Stock Paper sheets the
 * job asks for. A job being edited can reuse the sheets it already took.
 * The paper type rows are locked so two saves can't both spend the same sheets.
 */
export async function assertEnoughPaper(tx: Tx, requested: Map<string, number>, jobId?: string) {
  const ids = [...requested.keys()];
  if (ids.length === 0) return;
  await tx.$queryRaw`SELECT id FROM "PaperType" WHERE id IN (${Prisma.join(ids)}) FOR UPDATE`;
  const [types, sums, own] = await Promise.all([
    tx.paperType.findMany({ where: { id: { in: ids } } }),
    tx.stockMovement.groupBy({ by: ["paperTypeId"], where: { paperTypeId: { in: ids } }, _sum: { sheets: true } }),
    jobId ? netIssuedByJob(tx, jobId) : new Map<string, number>(),
  ]);
  const balance = new Map(sums.map((s) => [s.paperTypeId, s._sum.sheets ?? 0]));
  for (const type of types) {
    const available = (balance.get(type.id) ?? 0) + (own.get(type.id) ?? 0);
    const need = requested.get(type.id)!;
    if (need > available) {
      throw new NotEnoughPaper(
        `Not enough paper: ${type.client ? `${type.client} ` : "3P "}${paperTypeLabel(type)} has ${formatSheets(available)} sheets, this job needs ${formatSheets(need)}.`,
      );
    }
  }
}

export class NotEnoughPaper extends Error {}

/**
 * New job: one JOB_ISSUE row (−sheets) per paper type, adding up the sections
 * that use it, so each paper's ledger shows the job once.
 * Returns the paper type ids touched.
 */
export async function issueJobPaper(
  tx: Tx,
  job: {
    id: string;
    date: Date;
    client: string;
    jobName: string;
    sections: { paperTypeId: string | null; stockSheets: number | null }[];
    createdByEmail: string;
  },
) {
  const issued = [...sheetsByPaperType(job.sections)];
  if (issued.length > 0) {
    await tx.stockMovement.createMany({
      data: issued.map(([paperTypeId, sheets]) => ({
        paperTypeId,
        date: job.date,
        type: "JOB_ISSUE" as const,
        sheets: -sheets,
        particulars: `${job.client} – ${job.jobName}`,
        jobId: job.id,
        createdByEmail: job.createdByEmail,
      })),
    });
  }
  return issued.map(([paperTypeId]) => paperTypeId);
}

/** Net sheets a job currently holds per paper type (positive = taken from stock). */
export async function netIssuedByJob(tx: Tx, jobId: string) {
  const sums = await tx.stockMovement.groupBy({
    by: ["paperTypeId"],
    where: { jobId },
    _sum: { sheets: true },
  });
  return new Map(sums.map((s) => [s.paperTypeId, -(s._sum.sheets ?? 0)]));
}

/**
 * Edit job: one JOB_CORRECTION row per paper type whose new sheets differ from
 * what the job has net issued. Covers changed sheets, changed paper types,
 * switching 3P ↔ Clients and changing the client.
 * Returns the paper type ids touched.
 */
export async function correctJobPaper(
  tx: Tx,
  job: {
    id: string;
    date: Date;
    client: string;
    jobName: string;
    sections: { paperTypeId: string | null; stockSheets: number | null }[];
    createdByEmail: string;
  },
) {
  const net = await netIssuedByJob(tx, job.id);
  const rows = paperCorrections(net, sheetsByPaperType(job.sections));
  if (rows.length > 0) {
    await tx.stockMovement.createMany({
      data: rows.map((r) => ({
        paperTypeId: r.paperTypeId,
        date: job.date,
        type: "JOB_CORRECTION" as const,
        sheets: r.sheets,
        particulars: `Edited: ${job.client} – ${job.jobName}`,
        jobId: job.id,
        createdByEmail: job.createdByEmail,
      })),
    });
  }
  return rows.map((r) => r.paperTypeId);
}

/**
 * Cancel: JOB_CANCEL rows that bring the job's net issued sheets back to zero.
 * Returns the paper type ids touched.
 */
export async function returnJobPaper(
  tx: Tx,
  job: { id: string; client: string; jobName: string; date: Date; createdByEmail: string },
) {
  const net = await netIssuedByJob(tx, job.id);
  const rows = [...net].filter(([, sheets]) => sheets !== 0);
  if (rows.length > 0) {
    await tx.stockMovement.createMany({
      data: rows.map(([paperTypeId, sheets]) => ({
        paperTypeId,
        date: job.date,
        type: "JOB_CANCEL" as const,
        sheets,
        particulars: `Cancelled: ${job.client} – ${job.jobName}`,
        jobId: job.id,
        createdByEmail: job.createdByEmail,
      })),
    });
  }
  return rows.map(([id]) => id);
}
