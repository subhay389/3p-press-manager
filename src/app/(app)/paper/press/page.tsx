import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";

export default async function Page() {
  await requireUser();

  return <PageHeader title="Paper – 3P" description="Press paper stock and ledger — coming soon." />;
}
