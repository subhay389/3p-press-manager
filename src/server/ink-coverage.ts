"use server";

import { del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { inkCoverageSchema } from "@/lib/validators/ink-coverage";
import type { ActionResult } from "@/server/users";

const KIND_LABEL = { PHOTO: "photo", PDF: "PDF" } as const;

/** Links an uploaded Ink Coverage file to its job, replacing (and deleting) any earlier one. */
export async function saveInkCoverage(input: unknown): Promise<ActionResult> {
  const me = await assertAdmin();
  const parsed = inkCoverageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { jobId, kind, url, thumbUrl } = parsed.data;

  const job = await db.job.findUnique({
    where: { id: jobId },
    select: { jobNo: true, inkCoverageUrl: true, inkCoverageThumbUrl: true },
  });
  if (!job) {
    await deleteFiles([url, thumbUrl]);
    return { ok: false, error: "This job no longer exists." };
  }
  await db.job.update({
    where: { id: jobId },
    data: {
      inkCoverageKind: kind,
      inkCoverageUrl: url,
      inkCoverageThumbUrl: thumbUrl,
      inkCoverageAt: new Date(),
      inkCoverageByEmail: me,
    },
  });
  await deleteFiles([job.inkCoverageUrl, job.inkCoverageThumbUrl]);
  revalidatePath("/jobs");
  return { ok: true, message: `Ink Coverage ${KIND_LABEL[kind]} saved for job ${job.jobNo}.` };
}

export async function removeInkCoverage(jobId: string): Promise<ActionResult> {
  await assertAdmin();
  const job = await db.job.findUnique({
    where: { id: jobId },
    select: { jobNo: true, inkCoverageUrl: true, inkCoverageThumbUrl: true },
  });
  if (!job) return { ok: false, error: "This job no longer exists." };
  if (!job.inkCoverageUrl) return { ok: false, error: `Job ${job.jobNo} has no Ink Coverage.` };
  await db.job.update({
    where: { id: jobId },
    data: {
      inkCoverageKind: null,
      inkCoverageUrl: null,
      inkCoverageThumbUrl: null,
      inkCoverageAt: null,
      inkCoverageByEmail: null,
    },
  });
  await deleteFiles([job.inkCoverageUrl, job.inkCoverageThumbUrl]);
  revalidatePath("/jobs");
  return { ok: true, message: `Ink Coverage removed from job ${job.jobNo}.` };
}

/** Best effort: the job is already saved, so a failed delete only leaves an unused file. */
async function deleteFiles(urls: (string | null)[]) {
  const existing = urls.filter((u): u is string => !!u);
  if (existing.length === 0) return;
  try {
    await del(existing);
  } catch (e) {
    console.error("Couldn’t delete old Ink Coverage files", existing, e);
  }
}
