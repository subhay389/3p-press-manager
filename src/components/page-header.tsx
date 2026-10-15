import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Page title row (title optional). `actions` sits on the right (wraps below on phones). */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {title && <h1 className="text-2xl font-semibold tracking-tight text-navy">{title}</h1>}
        {description && (
          <p className={cn("text-sm text-muted-foreground", title && "mt-1")}>{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
