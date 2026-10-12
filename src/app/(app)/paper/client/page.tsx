import type { Metadata } from "next";
import { PackageOpen } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { AddPaperDialog } from "@/components/paper/add-paper-dialog";
import { PaperStockList } from "@/components/paper/paper-stock-list";
import { requireUser } from "@/lib/auth";
import { formatBs, todayBs } from "@/lib/nepali-date";
import { listPaperStock } from "@/server/inventory";

export const metadata: Metadata = { title: "Paper – Client" };

export default async function Page() {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";
  const stock = await listPaperStock("client");
  const known = stock.map(({ id, client, clientKey, category, gsm, size, balance }) => ({
    id,
    client,
    clientKey,
    category,
    gsm,
    size,
    balance,
  }));

  return (
    <>
      <PageHeader
        title="Paper – Client"
        description="Paper brought in by clients, by client, category, GSM and size. Their jobs take sheets from it."
        actions={isAdmin && <AddPaperDialog known={known} today={todayBs()} forClient />}
      />
      {stock.length === 0 ? (
        <EmptyState icon={PackageOpen} title="No client paper recorded yet">
          {isAdmin
            ? "Use “Add paper” when a client brings paper in. Record it before entering their job."
            : "Each client’s paper and its balance will appear here once an admin adds it."}
        </EmptyState>
      ) : (
        <PaperStockList
          showClient
          rows={stock.map((s) => ({
            ...s,
            lastDateBs: s.lastDate ? formatBs(s.lastDate) : null,
          }))}
        />
      )}
    </>
  );
}
