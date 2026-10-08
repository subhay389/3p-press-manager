import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";

export default async function Page() {
  await requireUser();

  return <PageHeader title="Job Records" description="Searchable list of all jobs — coming soon." />;
}
