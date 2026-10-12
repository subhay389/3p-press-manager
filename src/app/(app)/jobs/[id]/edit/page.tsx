import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { JobCardForm } from "@/components/job-card/job-card-form";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { listPaperStock, netIssuedByJob } from "@/server/inventory";
import { getJobCard } from "@/server/job-data";

export const metadata: Metadata = { title: "Edit Job" };

export default async function Page({ params }: PageProps<"/jobs/[id]/edit">) {
  await requireAdmin();
  const { id } = await params;
  const [job, stock, net] = await Promise.all([getJobCard(id), listPaperStock(), netIssuedByJob(db, id)]);
  if (!job) notFound();
  if (job.status === "CANCELLED") redirect(`/jobs?q=${job.jobNo}&view=${job.id}`);

  // Count this job's own sheets as available, so it doesn't block itself.
  const paperTypes = stock.map(({ id, client, clientKey, category, gsm, size, balance }) => ({
    id,
    client,
    clientKey,
    category,
    gsm,
    size,
    balance: balance + (net.get(id) ?? 0),
  }));

  return (
    <>
      <PageHeader
        title={`Edit Job ${job.jobNo}`}
        description="Change the job card. Any change to Stock Paper sheets is saved as a correction in the paper ledger."
      />
      <JobCardForm paperTypes={paperTypes} initialValues={job.values} jobId={job.id} />
    </>
  );
}
