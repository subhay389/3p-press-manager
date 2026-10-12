import type { Metadata } from "next";
import { PaperLedger, paperLedgerMetadata } from "@/components/paper/paper-ledger";

export async function generateMetadata({
  params,
}: PageProps<"/paper/client/[id]">): Promise<Metadata> {
  return paperLedgerMetadata((await params).id);
}

export default async function Page({ params }: PageProps<"/paper/client/[id]">) {
  return <PaperLedger id={(await params).id} owner="client" />;
}
