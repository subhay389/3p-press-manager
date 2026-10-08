import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth";

export default async function Page() {
  await requireAdmin();

  return <PageHeader title="Enter Job" description="Job card form — coming next." />;
}
