export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse">
      <div className="mb-2 h-7 w-48 rounded-md bg-muted" />
      <div className="mb-6 h-4 w-80 max-w-full rounded-md bg-muted" />
      <div className="h-64 rounded-xl bg-muted" />
    </div>
  );
}
