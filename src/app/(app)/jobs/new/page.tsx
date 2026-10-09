import type { Metadata } from "next";
import { FilePlus2 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Enter Job" };

export default async function Page() {
  await requireAdmin();

  return (
    <>
      <PageHeader
        title="Enter Job"
        description="Fill in a new job card. Paper is deducted from 3P stock when the job is saved."
      />
      <EmptyState icon={FilePlus2} title="The job card form is coming soon">
        It will look like the paper Job Card Sheet, with the same sections and fields.
      </EmptyState>
    </>
  );
}
