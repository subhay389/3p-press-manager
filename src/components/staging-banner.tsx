// Shown on every page of the staging site (Vercel preview builds), a practice
// copy for learning, so nobody enters real jobs there by mistake. Hidden in production and locally.
export function StagingBanner() {
  if (process.env.VERCEL_ENV !== "preview") return null;

  return (
    <div className="bg-staging px-4 py-1.5 text-center text-sm font-medium text-staging-foreground print:hidden">
      Practice site. Nothing you do here changes the real records.
    </div>
  );
}
