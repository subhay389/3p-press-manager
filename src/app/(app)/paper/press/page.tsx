import type { Metadata } from "next";
import { Layers } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { AddPaperDialog } from "@/components/paper/add-paper-dialog";
import { PaperStockList } from "@/components/paper/paper-stock-list";
import { requireUser } from "@/lib/auth";
import { formatBs, todayBs } from "@/lib/nepali-date";
import { listPaperStock } from "@/server/inventory";

export const metadata: Metadata = { title: "Paper – 3P" };

export default async function PaperPressPage() {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";
  const stock = await listPaperStock();
  const known = stock.map(({ id, category, gsm, size, balance }) => ({
    id,
    category,
    gsm,
    size,
    balance,
  }));

  return (
    <>
      <PageHeader
        title="Paper – 3P"
        description="Press-owned paper stock by category, GSM and size, counted in sheets."
        actions={isAdmin && <AddPaperDialog known={known} today={todayBs()} />}
      />
      {stock.length === 0 ? (
        <EmptyState icon={Layers} title="No paper in stock yet">
          {isAdmin
            ? "Use “Add paper” to record your current stock. Write “Opening stock” in Particulars."
            : "Paper types and their balance will appear here once an admin adds them."}
        </EmptyState>
      ) : (
        <PaperStockList
          rows={stock.map((s) => ({
            ...s,
            lastDateBs: s.lastDate ? formatBs(s.lastDate) : null,
          }))}
        />
      )}
    </>
  );
}
