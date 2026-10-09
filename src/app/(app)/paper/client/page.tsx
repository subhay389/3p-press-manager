import type { Metadata } from "next";
import { PackageOpen } from "lucide-react";
import { AddClientPaperButton, ClientPaperList } from "@/components/client-paper/client-paper-list";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatBs, todayBs } from "@/lib/nepali-date";

export const metadata: Metadata = { title: "Paper – Client" };

export default async function Page() {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";
  const records = await db.clientPaperRecord.findMany({
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    omit: { createdByEmail: true, createdAt: true, updatedAt: true },
  });
  const rows = records.map(({ date, ...r }) => ({ ...r, dateBs: formatBs(date) }));
  const today = todayBs();

  return (
    <>
      <PageHeader
        title="Paper – Client"
        description="Paper brought in by clients for their own jobs: what was cut for which job, and what is left. It doesn’t change 3P stock."
        actions={isAdmin && <AddClientPaperButton today={today} />}
      />
      {rows.length === 0 ? (
        <EmptyState icon={PackageOpen} title="No client paper recorded yet">
          {isAdmin
            ? "Use “Add paper” when a client brings paper in. Fill in Cutting when it is cut for a job."
            : "Each receipt will be listed with what was cut for which job and what is left."}
        </EmptyState>
      ) : (
        <ClientPaperList rows={rows} isAdmin={isAdmin} today={today} />
      )}
    </>
  );
}
