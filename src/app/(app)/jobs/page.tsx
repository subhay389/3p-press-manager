import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Job Records" };

export default async function Page() {
  await requireUser();

  return (
    <>
      <PageHeader
        title="Job Records"
        description="Every job, newest first. Open one to see its full job card or print it."
      />
      <EmptyState icon={ClipboardList} title="No jobs yet">
        Jobs entered on the Enter Job tab will be listed here, with search by job no, client or job name.
      </EmptyState>
    </>
  );
}
