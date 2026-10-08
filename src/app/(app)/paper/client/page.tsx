import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";

export default async function Page() {
  await requireUser();

  return <PageHeader title="Paper – Client" description="Client paper receipts — coming soon." />;
}
