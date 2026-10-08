import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { landingPathFor } from "@/lib/roles";

// The proxy normally redirects "/" first; this is the fallback.
export default async function Home() {
  const user = await requireUser();
  redirect(landingPathFor(user.role));
}
