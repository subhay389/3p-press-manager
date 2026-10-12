"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { assertAdmin, assertUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { nextJobNo, sheetsByPaperType } from "@/lib/jobs";
import { todayAd } from "@/lib/nepali-date";
import { normalizeClient } from "@/lib/paper";
import { jobRecordSchema, jobSchema, type ParsedJob } from "@/lib/validators/jobs";
import {
  assertEnoughPaper,
  correctJobPaper,
  issueJobPaper,
  NotEnoughPaper,
  returnJobPaper,
  revalidatePaperPages,
} from "@/server/inventory";
import { getJobCard } from "@/server/job-data";
import type { ActionResult } from "@/server/users";

const DUPLICATE_JOB_NO = "Please enter a unique job number";

/** Live check for the Job No field. When editing, pass the job's id so it doesn't count. */
export async function isJobNoTaken(jobNo: number, exceptJobId?: string): Promise<boolean> {
  await assertAdmin();
  if (!Number.isInteger(jobNo) || jobNo < 1) return false;
  return (await db.job.count({ where: { jobNo, ...(exceptJobId && { id: { not: exceptJobId } }) } })) > 0;
}

type Tx = Prisma.TransactionClient;

/**
 * Section rows to save. Each section's paper type must belong to the job's
 * paper stock (3P, or this client), and its category, GSM and size are copied
 * onto the section as Stock Paper.
 */
async function sectionRows(tx: Tx, job: Pick<ParsedJob, "paperStock" | "client">, sections: ParsedJob["sections"]) {
  const typeIds = [...new Set(sections.flatMap((s) => (s.paperTypeId ? [s.paperTypeId] : [])))];
  const types = await tx.paperType.findMany({ where: { id: { in: typeIds } } });
  const byId = new Map(types.map((t) => [t.id, t]));
  const ownerKey = job.paperStock === "PRESS" ? "" : normalizeClient(job.client);
  if (byId.size !== typeIds.length || types.some((t) => t.clientKey !== ownerKey)) {
    throw new MissingPaperType();
  }
  return sections.map(({ tally, ...s }) => {
    const type = s.paperTypeId ? byId.get(s.paperTypeId)! : null;
    return {
      ...s,
      tally: tally ?? Prisma.DbNull,
      ...(type && { category: type.category, gsm: type.gsm, stockSize: type.size }),
    };
  });
}

class MissingPaperType extends Error {}

/** Turns known save errors into a message for the form. */
function saveError(e: unknown): string {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return DUPLICATE_JOB_NO;
  if (e instanceof NotEnoughPaper) return e.message;
  if (e instanceof MissingPaperType) {
    return "The paper stock changed while you were editing. Reload the page and check the Stock Paper.";
  }
  throw e;
}

export async function createJob(input: unknown): Promise<ActionResult & { nextJobNo?: number }> {
  const me = await assertAdmin();
  const parsed = jobSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { sections, ...job } = parsed.data;

  let jobNo: number;
  try {
    jobNo = await db.$transaction(async (tx) => {
      const rows = await sectionRows(tx, job, sections);
      await assertEnoughPaper(tx, sheetsByPaperType(sections));
      const created = await tx.job.create({
        data: { ...job, createdByEmail: me, sections: { create: rows } },
      });
      await issueJobPaper(tx, {
        id: created.id,
        date: created.date,
        client: created.client,
        jobName: created.jobName,
        sections,
        createdByEmail: me,
      });
      return created.jobNo;
    });
  } catch (e) {
    return { ok: false, error: saveError(e) };
  }

  revalidateJobs();
  revalidatePath("/jobs/new");
  const max = await db.job.aggregate({ _max: { jobNo: true } });
  return { ok: true, message: `Job ${jobNo} saved.`, nextJobNo: nextJobNo(max._max.jobNo) };
}

/**
 * Edit job: saves the card and replaces its sections. Stock is put right with
 * JOB_CORRECTION rows dated today.
 */
export async function updateJob(id: string, input: unknown): Promise<ActionResult> {
  const me = await assertAdmin();
  const parsed = jobSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { sections, ...job } = parsed.data;

  let result: { jobNo: number } | { error: string };
  try {
    result = await db.$transaction(async (tx) => {
      const current = await tx.job.findUnique({ where: { id }, select: { status: true } });
      if (!current) return { error: "This job no longer exists." };
      if (current.status === "CANCELLED") return { error: "A cancelled job can’t be edited." };

      const rows = await sectionRows(tx, job, sections);
      await assertEnoughPaper(tx, sheetsByPaperType(sections), id);
      await tx.jobPaperSection.deleteMany({ where: { jobId: id } });
      const updated = await tx.job.update({
        where: { id },
        data: { ...job, sections: { create: rows } },
      });
      await correctJobPaper(tx, {
        id,
        date: todayAd(),
        client: updated.client,
        jobName: updated.jobName,
        sections,
        createdByEmail: me,
      });
      return { jobNo: updated.jobNo };
    });
  } catch (e) {
    return { ok: false, error: saveError(e) };
  }
  if ("error" in result) return { ok: false, error: result.error };

  revalidateJobs();
  revalidatePath(`/jobs/${id}/edit`);
  return { ok: true, message: `Job ${result.jobNo} updated.` };
}

/** Job Records plus every paper list and ledger, since a job can touch any stock. */
function revalidateJobs() {
  revalidatePath("/jobs");
  revalidatePaperPages();
}

/** Read-only: the Job Card for the View details modal. */
export async function viewJob(id: string) {
  await assertUser();
  return getJobCard(id);
}

/** Saves the Job Records-only columns (Col. through Remarks). */
export async function updateJobRecord(input: unknown): Promise<ActionResult> {
  await assertAdmin();
  const parsed = jobRecordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { id, ...data } = parsed.data;

  const job = await db.job.findUnique({ where: { id }, select: { jobNo: true } });
  if (!job) return { ok: false, error: "This job no longer exists." };
  await db.job.update({ where: { id }, data });
  revalidateJobs();
  return { ok: true, message: `Job ${job.jobNo} record saved.` };
}

export async function completeJob(id: string): Promise<ActionResult> {
  await assertAdmin();
  const { count } = await db.job.updateMany({
    where: { id, status: "CREATED" },
    data: { status: "COMPLETED" },
  });
  if (count === 0) return { ok: false, error: "Only jobs with status Created can be completed." };
  const job = await db.job.findUniqueOrThrow({ where: { id }, select: { jobNo: true } });
  revalidateJobs();
  return { ok: true, message: `Job ${job.jobNo} marked completed.` };
}

/** Keeps the record and returns any paper it took to stock. */
export async function cancelJob(id: string): Promise<ActionResult> {
  const me = await assertAdmin();

  const result = await db.$transaction(async (tx) => {
    const job = await tx.job.findUnique({ where: { id } });
    if (!job) return { error: "This job no longer exists." };
    const { count } = await tx.job.updateMany({
      where: { id, status: { not: "CANCELLED" } },
      data: { status: "CANCELLED" },
    });
    if (count === 0) return { error: `Job ${job.jobNo} is already cancelled.` };
    const paperTypeIds = await returnJobPaper(tx, {
      id,
      client: job.client,
      jobName: job.jobName,
      date: todayAd(),
      createdByEmail: me,
    });
    return { jobNo: job.jobNo, paperTypeIds };
  });

  if ("error" in result) return { ok: false, error: result.error! };
  revalidateJobs();
  return {
    ok: true,
    message: `Job ${result.jobNo} cancelled.${result.paperTypeIds.length > 0 ? " Its paper is back in stock." : ""}`,
  };
}
