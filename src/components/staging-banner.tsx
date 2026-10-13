// Shown on every page of the staging site (Vercel preview builds) so nobody
// enters real jobs there by mistake. Hidden in production and locally.
export function StagingBanner() {
  if (process.env.VERCEL_ENV !== "preview") return null;

  return (
    <div className="bg-staging px-4 py-1.5 text-center text-sm font-medium text-staging-foreground print:hidden">
      Staging site for testing. Changes here are not saved to the real records.
    </div>
  );
}
