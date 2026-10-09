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
import { RECORD_FIELDS, type RecordFieldKey, type RecordFields } from "@/lib/jobs";
import { updateJobRecord } from "@/server/jobs";

type Job = RecordFields & { id: string; jobNo: number; jobName: string; qty: number | null };

const GROUPS = [
  { title: "Binding", keys: ["recCol", "recStitching", "recFolding"] },
  { title: "Lamination", keys: ["recLamMatt", "recLamGlossy", "recLamQty", "recLamSize"] },
] as const satisfies { title: string; keys: RecordFieldKey[] }[];

const label = (key: RecordFieldKey) => RECORD_FIELDS.find((f) => f.key === key)!.label;

function toForm(job: Job) {
  return Object.fromEntries(RECORD_FIELDS.map((f) => [f.key, job[f.key] ?? ""])) as Record<
    RecordFieldKey,
    string
  >;
}

/** "Edit record": the Job Records-only columns, as free text. Mount with a `key` per job. */
export function EditRecordDialog({ job, onClose }: { job: Job; onClose: () => void }) {
  const [values, setValues] = useState(() => toForm(job));
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

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateJobRecord({ id: job.id, ...values });
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
              {job.jobName}. These columns are only on the Job Record, not on the job card. Write
              them as in the binder, e.g. ✓ or “C.S.”.
            </DialogDescription>
          </DialogHeader>

          {GROUPS.map((g) => (
            <fieldset key={g.title} className="grid gap-2">
              <legend className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {g.title}
              </legend>
              <div className={g.keys.length === 3 ? "grid grid-cols-3 gap-2" : "grid grid-cols-2 gap-2 sm:grid-cols-4"}>
                {g.keys.map((k) => (
                  <div key={k}>{field(k)}</div>
                ))}
              </div>
            </fieldset>
          ))}

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
