"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { JobCard } from "@/components/job-card/job-card";
import type { KnownPaperType } from "@/components/paper/paper-type-fields";
import { Button } from "@/components/ui/button";
import {
  emptyJobCard,
  SECTIONS,
  sheetsByPaperType,
  sumPlates,
  type JobCardValues,
  type SectionKey,
  type SectionValues,
} from "@/lib/jobs";
import { createJob, isJobNoTaken } from "@/server/jobs";

const DUPLICATE_JOB_NO = "Please enter a unique job number";
const PLATE_FIELDS = ["colorPlates", "bwPlates", "spotPlates"] as const;

/** Enter Job: the Job Card in form mode, saved with `createJob`. */
export function JobCardForm({
  paperTypes,
  initialJobNo,
  today,
}: {
  paperTypes: KnownPaperType[];
  initialJobNo: number;
  today: string;
}) {
  const [values, setValues] = useState<JobCardValues>(() => emptyJobCard(initialJobNo, today));
  // Total Plates follows Color + B/W + Spot until someone types their own total.
  const [autoTotal, setAutoTotal] = useState(true);
  // Result of the last uniqueness check; only counts while Job No is unchanged.
  const [jobNoCheck, setJobNoCheck] = useState({ jobNo: "", taken: false });
  const jobNoTaken = jobNoCheck.taken && jobNoCheck.jobNo === values.jobNo;
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Live uniqueness check for Job No (debounced).
  useEffect(() => {
    const typed = values.jobNo;
    const jobNo = Number(typed);
    if (!Number.isInteger(jobNo) || jobNo < 1) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const taken = await isJobNoTaken(jobNo).catch(() => false);
      if (!cancelled) setJobNoCheck({ jobNo: typed, taken });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [values.jobNo]);

  function onChange(patch: Partial<JobCardValues>) {
    setError(null);
    let auto = autoTotal;
    if ("totalPlates" in patch) {
      auto = patch.totalPlates === "";
      setAutoTotal(auto);
    }
    setValues((v) => {
      const next = { ...v, ...patch };
      if (auto && (PLATE_FIELDS.some((k) => k in patch) || "totalPlates" in patch)) {
        next.totalPlates = sumPlates(next);
      }
      return next;
    });
  }

  function onSectionChange(key: SectionKey, patch: Partial<SectionValues>) {
    setError(null);
    setValues((v) => ({ ...v, sections: { ...v.sections, [key]: { ...v.sections[key], ...patch } } }));
  }

  function reset(jobNo: number, date: string) {
    setValues(emptyJobCard(jobNo, date));
    setAutoTotal(true);
    setError(null);
  }

  const shortTypes =
    values.paperStock === "PRESS"
      ? [...sheetsByPaperType(SECTIONS.map((k) => values.sections[k]))].filter(
          ([id, need]) => need > (paperTypes.find((p) => p.id === id)?.balance ?? 0),
        ).length
      : 0;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (jobNoTaken) {
      setError(DUPLICATE_JOB_NO);
      document.getElementById("job-card")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createJob({
        ...values,
        sections: SECTIONS.map((section) => ({ section, ...values.sections[section] })),
      });
      if (!result.ok) {
        setError(result.error);
        if (result.error === DUPLICATE_JOB_NO) setJobNoCheck({ jobNo: values.jobNo, taken: true });
        toast.error(result.error);
        return;
      }
      if (result.paperShortage) toast.warning(result.message);
      else toast.success(result.message);
      // Keep the date: several jobs are often entered for the same day.
      reset(result.nextJobNo ?? Number(values.jobNo) + 1, values.date);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-5xl gap-4">
      <div id="job-card" className="scroll-mt-20">
        <JobCard
          mode="form"
          values={values}
          onChange={onChange}
          onSectionChange={onSectionChange}
          paperTypes={paperTypes}
          jobNoError={jobNoTaken ? DUPLICATE_JOB_NO : null}
        />
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t bg-page/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:bg-card/95 sm:shadow-sm">
        <div className="mr-auto min-w-0 text-sm">
          {error ? (
            <p role="alert" className="font-medium text-destructive">
              {error}
            </p>
          ) : shortTypes > 0 ? (
            <p className="font-medium text-destructive">
              Not enough paper for {shortTypes === 1 ? "1 paper type" : `${shortTypes} paper types`}. You
              can still save; the job will be flagged.
            </p>
          ) : (
            <p className="text-muted-foreground">
              {values.paperStock === "PRESS"
                ? "Sheets are deducted from 3P stock when you save."
                : "Client paper: 3P stock is not changed."}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => reset(Number(values.jobNo) || initialJobNo, values.date)}
          >
            <RotateCcw /> Clear
          </Button>
          <Button type="submit" disabled={pending || jobNoTaken}>
            <Save /> {pending ? "Saving…" : "Save job"}
          </Button>
        </div>
      </div>
    </form>
  );
}
