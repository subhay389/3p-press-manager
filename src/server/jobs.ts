"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { assertAdmin, assertUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { nextJobNo, sheetsByPaperType } from "@/lib/jobs";
import { todayAd } from "@/lib/nepali-date";
import { jobRecordSchema, jobSchema, type ParsedJob } from "@/lib/validators/jobs";
import { anyBelowZero, correctJobPaper, issueJobPaper, returnJobPaper } from "@/server/inventory";
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

/** Section rows to save. A 3P section records its paper type's description too. */
async function sectionRows(tx: Tx, sections: ParsedJob["sections"]) {
  const typeIds = [...new Set(sections.flatMap((s) => (s.paperTypeId ? [s.paperTypeId] : [])))];
  const types = await tx.paperType.findMany({ where: { id: { in: typeIds } } });
  const byId = new Map(types.map((t) => [t.id, t]));
  if (byId.size !== typeIds.length) throw new MissingPaperType();
  return sections.map(({ tally, ...s }) => {
    const type = s.paperTypeId ? byId.get(s.paperTypeId)! : null;
    return {
      ...s,
      tally: tally ?? Prisma.DbNull,
      ...(type && { category: type.category, gsm: type.gsm, size: type.size }),
    };
  });
}

/** Turns known save errors into a message for the form. */
function saveError(e: unknown): string {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return DUPLICATE_JOB_NO;
  if (e instanceof MissingPaperType) {
    return "A chosen paper type no longer exists. Reload the page and pick again.";
  }
  throw e;
}

export async function createJob(
  input: unknown,
): Promise<ActionResult & { nextJobNo?: number; paperShortage?: boolean }> {
  const me = await assertAdmin();
  const parsed = jobSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { sections, ...job } = parsed.data;

  let result: { jobNo: number; paperShortage: boolean; paperTypeIds: string[] };
  try {
    result = await db.$transaction(async (tx) => {
      const created = await tx.job.create({
        data: { ...job, createdByEmail: me, sections: { create: await sectionRows(tx, sections) } },
      });

      const paperTypeIds = await issueJobPaper(tx, {
        id: created.id,
        date: created.date,
        client: created.client,
        jobName: created.jobName,
        sections,
        createdByEmail: me,
      });
      const paperShortage = await anyBelowZero(tx, paperTypeIds);
      if (paperShortage) {
        await tx.job.update({ where: { id: created.id }, data: { paperShortage } });
      }
      return { jobNo: created.jobNo, paperShortage, paperTypeIds };
    });
  } catch (e) {
    return { ok: false, error: saveError(e) };
  }

  revalidatePath("/jobs");
  revalidatePath("/jobs/new");
  revalidatePath("/paper/press");
  for (const id of result.paperTypeIds) revalidatePath(`/paper/press/${id}`);

  const max = await db.job.aggregate({ _max: { jobNo: true } });
  return {
    ok: true,
    message: `Job ${result.jobNo} saved.${result.paperShortage ? " Not enough paper in stock." : ""}`,
    nextJobNo: nextJobNo(max._max.jobNo),
    paperShortage: result.paperShortage,
  };
}

/**
 * Edit job: saves the card and replaces its sections. 3P stock is put right with
 * JOB_CORRECTION rows dated today, and the shortage flag is recomputed.
 */
export async function updateJob(
  id: string,
  input: unknown,
): Promise<ActionResult & { paperShortage?: boolean }> {
  const me = await assertAdmin();
  const parsed = jobSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { sections, ...job } = parsed.data;

  let result: { jobNo: number; paperShortage: boolean; paperTypeIds: string[] } | { error: string };
  try {
    result = await db.$transaction(async (tx) => {
      const current = await tx.job.findUnique({ where: { id }, select: { status: true } });
      if (!current) return { error: "This job no longer exists." };
      if (current.status === "CANCELLED") return { error: "A cancelled job can’t be edited." };

      const rows = await sectionRows(tx, sections);
      await tx.jobPaperSection.deleteMany({ where: { jobId: id } });
      const updated = await tx.job.update({
        where: { id },
        data: { ...job, sections: { create: rows } },
      });

      const corrected = await correctJobPaper(tx, {
        id,
        date: todayAd(),
        client: updated.client,
        jobName: updated.jobName,
        sections,
        createdByEmail: me,
      });
      const paperShortage = await anyBelowZero(tx, [...sheetsByPaperType(sections).keys()]);
      if (paperShortage !== updated.paperShortage) {
        await tx.job.update({ where: { id }, data: { paperShortage } });
      }
      return { jobNo: updated.jobNo, paperShortage, paperTypeIds: corrected };
    });
  } catch (e) {
    return { ok: false, error: saveError(e) };
  }
  if ("error" in result) return { ok: false, error: result.error };

  revalidateJobs(result.paperTypeIds);
  revalidatePath(`/jobs/${id}/edit`);
  return {
    ok: true,
    message: `Job ${result.jobNo} updated.${result.paperShortage ? " Not enough paper in stock." : ""}`,
    paperShortage: result.paperShortage,
  };
}

class MissingPaperType extends Error {}

function revalidateJobs(paperTypeIds: string[] = []) {
  revalidatePath("/jobs");
  if (paperTypeIds.length > 0) revalidatePath("/paper/press");
  for (const id of paperTypeIds) revalidatePath(`/paper/press/${id}`);
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

/** Keeps the record and returns any 3P paper it took to stock. */
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
  revalidateJobs(result.paperTypeIds);
  return {
    ok: true,
    message: `Job ${result.jobNo} cancelled.${result.paperTypeIds.length > 0 ? " Its paper is back in 3P stock." : ""}`,
  };
}
