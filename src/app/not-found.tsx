import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-page px-4 py-16 text-center">
      <LogoMark className="size-12 text-lg" />
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-navy">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        This page doesn&apos;t exist. It may have been moved, or the link may be wrong.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Go to home</Link>
      </Button>
    </main>
  );
}
