import type { Metadata } from "next";
import { PackageOpen } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Paper – Client" };

export default async function Page() {
  await requireUser();

  return (
    <>
      <PageHeader
        title="Paper – Client"
        description="Paper brought in by clients for their own jobs."
      />
      <EmptyState icon={PackageOpen} title="No client paper recorded yet">
        Each receipt will be listed with what was cut for which job and what is left.
      </EmptyState>
    </>
  );
}
