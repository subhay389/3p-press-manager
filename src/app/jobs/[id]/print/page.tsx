import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JobCard } from "@/components/job-card/job-card";
import { PrintToolbar } from "@/components/jobs/print-toolbar";
import { requireUser } from "@/lib/auth";
import { getJobCard } from "@/server/job-data";

export async function generateMetadata({ params }: PageProps<"/jobs/[id]/print">): Promise<Metadata> {
  const { id } = await params;
  const job = await getJobCard(id);
  return { title: job ? `Job ${job.jobNo}` : "Job" };
}

/** The Job Card on one A4 page, colours kept. Opens the print dialog on load. */
export default async function PrintJobPage({ params }: PageProps<"/jobs/[id]/print">) {
  await requireUser();
  const { id } = await params;
  const job = await getJobCard(id);
  if (!job) notFound();

  return (
    <div className="min-h-full flex-1 bg-page [print-color-adjust:exact] print:bg-white">
      <PrintToolbar jobNo={job.jobNo} cancelled={job.status === "CANCELLED"} />
      <div className="overflow-x-auto px-4 pb-10 print:overflow-visible print:p-0">
        {/* Laid out at the View details width so print looks the same, then scaled
            down to fit the A4 page (see PrintToolbar). */}
        <div id="print-card" className="mx-auto w-[61rem]">
          <JobCard mode="print" values={job.values} />
        </div>
      </div>
    </div>
  );
}
