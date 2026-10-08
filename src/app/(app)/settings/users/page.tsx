import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth";

export default async function Page() {
  await requireAdmin();

  return <PageHeader title="Users" description="Manage who can sign in — coming soon." />;
}
