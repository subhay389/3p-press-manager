import type { Metadata } from "next";
import { PaperLedger, paperLedgerMetadata } from "@/components/paper/paper-ledger";

export async function generateMetadata({
  params,
}: PageProps<"/paper/press/[id]">): Promise<Metadata> {
  return paperLedgerMetadata((await params).id);
}

export default async function Page({ params }: PageProps<"/paper/press/[id]">) {
  return <PaperLedger id={(await params).id} owner="press" />;
}
