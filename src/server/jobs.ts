"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { assertAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { nextJobNo } from "@/lib/jobs";
import { jobSchema } from "@/lib/validators/jobs";
import { anyBelowZero, issueJobPaper } from "@/server/inventory";
import type { ActionResult } from "@/server/users";

const DUPLICATE_JOB_NO = "Please enter a unique job number";

/** Live check for the Job No field. */
export async function isJobNoTaken(jobNo: number): Promise<boolean> {
  await assertAdmin();
  if (!Number.isInteger(jobNo) || jobNo < 1) return false;
  return (await db.job.count({ where: { jobNo } })) > 0;
}

export async function createJob(
  input: unknown,
): Promise<ActionResult & { nextJobNo?: number; paperShortage?: boolean }> {
  const me = await assertAdmin();
  const parsed = jobSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { sections, ...job } = parsed.data;

  const typeIds = [...new Set(sections.flatMap((s) => (s.paperTypeId ? [s.paperTypeId] : [])))];

  let result: { jobNo: number; paperShortage: boolean; paperTypeIds: string[] };
  try {
    result = await db.$transaction(async (tx) => {
      const types = await tx.paperType.findMany({ where: { id: { in: typeIds } } });
      const byId = new Map(types.map((t) => [t.id, t]));
      if (byId.size !== typeIds.length) throw new MissingPaperType();

      const created = await tx.job.create({
        data: {
          ...job,
          createdByEmail: me,
          sections: {
            create: sections.map(({ tally, ...s }) => {
              const type = s.paperTypeId ? byId.get(s.paperTypeId)! : null;
              return {
                ...s,
                tally: tally ?? Prisma.DbNull,
                // A 3P section records its paper type's description too.
                ...(type && { category: type.category, gsm: type.gsm, size: type.size }),
              };
            }),
          },
        },
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
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: DUPLICATE_JOB_NO };
    }
    if (e instanceof MissingPaperType) {
      return { ok: false, error: "A chosen paper type no longer exists. Reload the page and pick again." };
    }
    throw e;
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

class MissingPaperType extends Error {}
