"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileImage, FileText, LoaderCircle, Pencil, Printer } from "lucide-react";
import { JobCard } from "@/components/job-card/job-card";
import { StatusBadge } from "@/components/jobs/job-badges";
import { PrintJob } from "@/components/jobs/print-job";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { JobCardData } from "@/server/job-data";
import { viewJob } from "@/server/jobs";

/** View details: the saved Job Card, read-only, with Print. Mount with a `key` per job. */
export function JobViewDialog({
  job,
  isAdmin = false,
  onClose,
}: {
  /** `jobName` is optional: without it, the name shows once the card loads. */
  job: { id: string; jobNo: number; jobName?: string };
  isAdmin?: boolean;
  onClose: () => void;
}) {
  const [data, setData] = useState<JobCardData | null | "error">(null);
  // Bumped by Print: each value mounts a fresh PrintJob, which opens the print dialog.
  const [printRun, setPrintRun] = useState(0);

  useEffect(() => {
    let cancelled = false;
    viewJob(job.id)
      .then((d) => !cancelled && setData(d ?? "error"))
      .catch(() => !cancelled && setData("error"));
    return () => {
      cancelled = true;
    };
  }, [job.id]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-1.5rem)] gap-3 overflow-y-auto bg-page p-3 sm:max-w-5xl sm:p-4">
        <DialogHeader className="flex-row flex-wrap items-center gap-x-3 gap-y-2 pr-8">
          <div className="mr-auto min-w-0">
            <DialogTitle className="text-navy">Job {job.jobNo}</DialogTitle>
            <DialogDescription className="truncate">
              {job.jobName ?? (data && data !== "error" ? data.jobName : "")}
            </DialogDescription>
          </div>
          {data && data !== "error" && (
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={data.status} />
              {data.inkCoverage && (
                <Button asChild size="sm" variant="outline">
                  <a href={data.inkCoverage.url} target="_blank" rel="noopener">
                    {data.inkCoverage.kind === "PDF" ? <FileText /> : <FileImage />} Ink Coverage
                  </a>
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setPrintRun((n) => n + 1)}>
                <Printer /> Print
              </Button>
              {isAdmin && data.status !== "CANCELLED" && (
                <Button asChild size="sm">
                  <Link href={`/jobs/${job.id}/edit`}>
                    <Pencil /> Edit job
                  </Link>
                </Button>
              )}
            </div>
          )}
        </DialogHeader>

        {data === null ? (
          <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Loading job card…
          </div>
        ) : data === "error" ? (
          <p role="alert" className="py-16 text-center text-sm text-destructive">
            Couldn’t load this job. It may have been removed. Reload the page and try again.
          </p>
        ) : (
          <JobCard mode="view" values={data.values} />
        )}
        {printRun > 0 && data && data !== "error" && <PrintJob key={printRun} values={data.values} />}
      </DialogContent>
    </Dialog>
  );
}
