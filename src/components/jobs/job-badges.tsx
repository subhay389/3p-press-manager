import { Badge } from "@/components/ui/badge";
import { statusLabel, type JobStatusValue } from "@/lib/jobs";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<JobStatusValue, string> = {
  CREATED: "bg-navy/10 text-navy",
  COMPLETED: "bg-emerald-50 text-emerald-800",
  CANCELLED: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: JobStatusValue }) {
  return <Badge className={cn("rounded-md", STATUS_STYLE[status])}>{statusLabel(status)}</Badge>;
}
