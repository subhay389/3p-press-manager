import type { Metadata } from "next";
import { Layers } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Paper – 3P" };

export default async function Page() {
  await requireUser();

  return (
    <>
      <PageHeader
        title="Paper – 3P"
        description="Press-owned paper stock by category, GSM and size, counted in sheets."
      />
      <EmptyState icon={Layers} title="No paper in stock yet">
        Paper types and their running balance will appear here. Open one to see its full ledger.
      </EmptyState>
    </>
  );
}
