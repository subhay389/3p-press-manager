"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TickBox } from "@/components/job-card/parts";
import { RECORD_FIELDS, type Lamination, type RecordFieldKey, type RecordFields } from "@/lib/jobs";
import { updateJobRecord } from "@/server/jobs";

type Job = RecordFields & { id: string; jobNo: number; jobName: string; qty: number | null; stitching: string };

const label = (key: RecordFieldKey) => RECORD_FIELDS.find((f) => f.key === key)!.label;

function toForm(job: Job) {
  return Object.fromEntries(RECORD_FIELDS.map((f) => [f.key, job[f.key] ?? ""])) as Record<
    RecordFieldKey,
    string
  >;
}

/** "Edit record": the Job Records-only columns. Mount with a `key` per job. */
export function EditRecordDialog({ job, onClose }: { job: Job; onClose: () => void }) {
  const [values, setValues] = useState(() => toForm(job));
  // The same Collection and Folding ticks as on the job card.
  const [col, setCol] = useState(job.recCol);
  const [folding, setFolding] = useState(job.recFolding);
  // The same lamination as on the job card: Matt or Gloss (not both), B-Side on its own.
  const [lamination, setLamination] = useState((job.lamination ?? "") as Lamination | "");
  const [bSide, setBSide] = useState(job.laminationBSide);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const field = (key: RecordFieldKey, props: { placeholder?: string; inputMode?: "numeric" } = {}) => (
    <div className="grid gap-1.5">
      <Label htmlFor={`rec-${key}`}>{label(key)}</Label>
      <Input
        id={`rec-${key}`}
        autoComplete="off"
        value={values[key]}
        onChange={(e) => {
          setError(null);
          setValues((v) => ({ ...v, [key]: e.target.value }));
        }}
        {...props}
      />
    </div>
  );

  const tick = (id: string, text: string, checked: boolean, onChange: (checked: boolean) => void) => (
    <div className="grid justify-items-start gap-1.5">
      <Label htmlFor={`rec-${id}`}>{text}</Label>
      <div className="flex h-8 items-center">
        <TickBox
          id={`rec-${id}`}
          checked={checked}
          onChange={(c) => {
            setError(null);
            onChange(c);
          }}
        />
      </div>
    </div>
  );
  const laminationTick = (value: Lamination, text: string) =>
    tick(value.toLowerCase(), text, lamination === value, (c) => setLamination(c ? value : ""));

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateJobRecord({
        id: job.id,
        ...values,
        recCol: col,
        recFolding: folding,
        lamination,
        laminationBSide: bSide,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(result.message);
      onClose();
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Edit record · Job {job.jobNo}</DialogTitle>
            <DialogDescription>
              {job.jobName}. Col., Folding, Matt, Gloss and B-Side are the same ticks as on
              the job card.
            </DialogDescription>
          </DialogHeader>

          <fieldset className="grid gap-2">
            <legend className={LEGEND}>Binding</legend>
            <div className="grid grid-cols-[auto_auto_1fr] gap-3">
              {tick("col", "Col.", col, setCol)}
              {tick("folding", "Folding", folding, setFolding)}
              <div className="grid min-w-0 gap-1.5">
                <span className="text-sm font-medium">Stitching</span>
                <p className="flex min-h-8 items-center rounded-lg border bg-muted/40 px-2.5 py-1 text-sm break-words">
                  {job.stitching || "—"}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Stitching is the Binding and Other on the job card. Change it with Edit job.
            </p>
          </fieldset>
          <fieldset className="grid gap-2">
            <legend className={LEGEND}>Lamination</legend>
            <div className="grid grid-cols-[auto_auto_auto_1fr_1fr] gap-3 max-sm:grid-cols-3">
              {laminationTick("MATT", "Matt")}
              {laminationTick("GLOSS", "Gloss")}
              {tick("bside", "B-Side", bSide, setBSide)}
              {field("recLamQty")}
              {field("recLamSize")}
            </div>
          </fieldset>

          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <span className="text-sm font-medium">Required Qty</span>
              <p className="flex h-8 items-center rounded-lg border bg-muted/40 px-2.5 text-sm tabular-nums">
                {job.qty ?? "—"}
              </p>
            </div>
            {field("deliveryQty", { placeholder: "Delivered qty" })}
          </div>
          {field("remarks")}
          <p className="-mt-2 text-xs text-muted-foreground">
            Required Qty is the Qty on the job card. Change it with Edit job.
          </p>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save record"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const LEGEND = "mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase";
