import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-brand-soft text-primary">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-semibold">{title}</h2>
      {children && (
        <div className="mt-1 max-w-sm text-sm text-muted-foreground">{children}</div>
      )}
    </div>
  );
}
