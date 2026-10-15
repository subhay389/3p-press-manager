import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, FilePlus2 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { JobRecordsList } from "@/components/jobs/job-records-list";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { listJobs } from "@/server/job-data";

export const metadata: Metadata = { title: "Job Records" };

export default async function Page({ searchParams }: PageProps<"/jobs">) {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";
  const [jobs, params] = await Promise.all([listJobs(), searchParams]);
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  return (
    <>
      <PageHeader
        title="Job Records"
        description="Every job, newest first. Open one to see its full job card or print it."
        actions={
          isAdmin && (
            <Button asChild>
              <Link href="/jobs/new">
                <FilePlus2 /> Create job
              </Link>
            </Button>
          )
        }
      />
      {jobs.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No jobs yet">
          {isAdmin
            ? "Jobs you save on Create Job are listed here."
            : "Jobs will be listed here once an admin enters them."}
        </EmptyState>
      ) : (
        <JobRecordsList
          rows={jobs}
          isAdmin={isAdmin}
          initialQuery={first(params.q) ?? ""}
          initialViewId={first(params.view)}
        />
      )}
    </>
  );
}
