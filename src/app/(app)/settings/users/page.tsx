import type { Metadata } from "next";
import { Users } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Users" };

export default async function Page() {
  await requireAdmin();

  return (
    <>
      <PageHeader
        title="Users"
        description="Who can sign in, and whether they are an admin or staff."
      />
      <EmptyState icon={Users} title="User management is coming soon">
        Admins will add family and staff by their Gmail address here.
      </EmptyState>
    </>
  );
}
