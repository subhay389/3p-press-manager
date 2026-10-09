import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { JobCardForm } from "@/components/job-card/job-card-form";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { emptyJobCard, nextJobNo } from "@/lib/jobs";
import { todayBs } from "@/lib/nepali-date";
import { listPaperStock } from "@/server/inventory";

export const metadata: Metadata = { title: "Enter Job" };

export default async function Page() {
  await requireAdmin();
  const [stock, max] = await Promise.all([
    listPaperStock(),
    db.job.aggregate({ _max: { jobNo: true } }),
  ]);
  const paperTypes = stock.map(({ id, category, gsm, size, balance }) => ({
    id,
    category,
    gsm,
    size,
    balance,
  }));

  return (
    <>
      <PageHeader
        title="Enter Job"
        description="Fill in the job card. For 3P paper, the sheets are deducted from stock when you save."
      />
      <JobCardForm paperTypes={paperTypes} initialValues={emptyJobCard(nextJobNo(max._max.jobNo), todayBs())} />
    </>
  );
}
