import "server-only";
import { db } from "@/lib/db";
import { inkCoverageOf } from "@/lib/ink-coverage";
import { jobToCardValues, stitchingText } from "@/lib/jobs";
import { formatBs } from "@/lib/nepali-date";

// Read-only job queries for pages. Mutations live in src/server/jobs.ts.

/** Every job for Job Records, newest first (small press: filtered on the client). */
export async function listJobs() {
  const jobs = await db.job.findMany({
    orderBy: [{ date: "desc" }, { jobNo: "desc" }],
    select: {
      id: true,
      jobNo: true,
      date: true,
      client: true,
      jobName: true,
      qty: true,
      paperStock: true,
      status: true,
      lamination: true,
      laminationBSide: true,
      bindings: true,
      other: true,
      recCol: true,
      recFolding: true,
      recLamQty: true,
      recLamSize: true,
      deliveryQty: true,
      remarks: true,
      inkCoverageKind: true,
      inkCoverageUrl: true,
      inkCoverageThumbUrl: true,
    },
  });
  return jobs.map(({ date, bindings, other, inkCoverageKind, inkCoverageUrl, inkCoverageThumbUrl, ...j }) => ({
    ...j,
    stitching: stitchingText(bindings, other),
    dateBs: formatBs(date),
    inkCoverage: inkCoverageOf({ inkCoverageKind, inkCoverageUrl, inkCoverageThumbUrl }),
  }));
}

export type JobListRow = Awaited<ReturnType<typeof listJobs>>[number];

/** One job as Job Card values plus the facts shown around the card. */
export async function getJobCard(id: string) {
  const job = await db.job.findUnique({
    where: { id },
    include: { sections: { orderBy: { section: "asc" } } },
  });
  if (!job) return null;
  return {
    id: job.id,
    jobNo: job.jobNo,
    client: job.client,
    jobName: job.jobName,
    status: job.status,
    inkCoverage: inkCoverageOf(job),
    values: jobToCardValues({ ...job, dateBs: formatBs(job.date) }),
  };
}

export type JobCardData = NonNullable<Awaited<ReturnType<typeof getJobCard>>>;
