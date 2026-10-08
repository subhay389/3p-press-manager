import { AppNav } from "@/components/nav/app-nav";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();

  return (
    <>
      <AppNav user={{ email: user.email!, name: user.name, role: user.role }} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
