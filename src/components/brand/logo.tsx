import { cn } from "@/lib/utils";

/** Navy "3P" mark. Keep in sync with src/app/icon.svg, src/app/apple-icon.png and public/icon-*.png. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-8 shrink-0 select-none items-center justify-center rounded-lg bg-navy text-[0.95rem] font-extrabold tracking-tighter text-navy-foreground",
        className,
      )}
    >
      3P
    </span>
  );
}

/** Mark + "3P Press" wordmark. */
export function Logo({ className, subtitle }: { className?: string; subtitle?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="font-semibold tracking-tight text-navy">3P Press</span>
        {subtitle && (
          <span className="mt-1 text-[0.7rem] text-muted-foreground">{subtitle}</span>
        )}
      </span>
    </span>
  );
}
