"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { BsDateInput } from "@/components/bs-date-input";
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
import { clientBalanceSheets, DEFAULT_CATEGORIES, formatSheets } from "@/lib/paper";
import { cn } from "@/lib/utils";
import { addClientPaper, updateClientPaper } from "@/server/client-paper";

/** A Paper – Client row as the page passes it to the client. */
export type ClientPaperRow = {
  id: string;
  dateBs: string;
  client: string;
  gsm: number | null;
  category: string | null;
  size: string | null;
  packets: number | null;
  sheets: number | null;
  cutJob: string | null;
  cutJobNo: string | null;
  cutPackets: number | null;
  cutSheets: number | null;
  balancePackets: number | null;
  remarks: string | null;
};

type Values = Record<Exclude<keyof ClientPaperRow, "id" | "dateBs">, string> & { date: string };

const NUMERIC = new Set<keyof Values>(["gsm", "packets", "sheets", "cutPackets", "cutSheets", "balancePackets"]);

function toValues(row: ClientPaperRow | undefined, today: string): Values {
  const text = (v: string | number | null | undefined) => (v === null || v === undefined ? "" : String(v));
  return {
    date: row?.dateBs ?? today,
    client: text(row?.client),
    gsm: text(row?.gsm),
    category: text(row?.category),
    size: text(row?.size),
    packets: text(row?.packets),
    sheets: text(row?.sheets),
    cutJob: text(row?.cutJob),
    cutJobNo: text(row?.cutJobNo),
    cutPackets: text(row?.cutPackets),
    cutSheets: text(row?.cutSheets),
    balancePackets: text(row?.balancePackets),
    remarks: text(row?.remarks),
  };
}

/**
 * Add or edit one Paper – Client row (with `row`, it edits). Cutting is often
 * filled in later, when the paper is cut for a job. Mount with a `key` per row.
 */
export function ClientPaperDialog({
  row,
  today,
  onClose,
}: {
  row?: ClientPaperRow;
  today: string;
  onClose: () => void;
}) {
  const [values, setValues] = useState(() => toValues(row, today));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const num = (v: string) => (v === "" ? null : Number(v));
  const balance = clientBalanceSheets(num(values.sheets), num(values.cutSheets));

  const field = (
    key: keyof Values,
    label: ReactNode,
    props: { placeholder?: string; list?: string; required?: boolean; className?: string } = {},
  ) => (
    <div className={cn("grid gap-1.5 self-start", props.className)}>
      <Label htmlFor={`cp-${key}`}>{label}</Label>
      <Input
        id={`cp-${key}`}
        autoComplete="off"
        inputMode={NUMERIC.has(key) ? "numeric" : undefined}
        placeholder={props.placeholder}
        list={props.list}
        required={props.required}
        value={values[key]}
        onChange={(e) => {
          setError(null);
          const v = NUMERIC.has(key) ? e.target.value.replace(/\D/g, "") : e.target.value;
          setValues((prev) => ({ ...prev, [key]: v }));
        }}
      />
    </div>
  );

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const result = row ? await updateClientPaper({ id: row.id, ...values }) : await addClientPaper(values);
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
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{row ? "Edit client paper" : "Add client paper"}</DialogTitle>
            <DialogDescription>
              Paper a client brought in for their own jobs. It doesn’t change 3P stock. Fill in
              Cutting now or later, when the paper is cut.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
            <div className="grid gap-1.5 self-start">
              <Label htmlFor="cp-date">Date</Label>
              <BsDateInput
                id="cp-date"
                value={values.date}
                onChange={(date) => setValues((v) => ({ ...v, date }))}
                required
              />
            </div>
            {field("client", "Client", { required: true })}
          </div>

          <Group title="Paper">
            <div className="grid grid-cols-3 gap-2">
              {field("gsm", "GSM")}
              {field("category", "Category", { list: "cp-categories", placeholder: "TC" })}
              {field("size", "Size", { placeholder: "25x36" })}
            </div>
            <datalist id="cp-categories">
              {DEFAULT_CATEGORIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <div className="grid grid-cols-2 gap-2">
              {field("packets", "Pkts")}
              {field("sheets", "Sheets")}
            </div>
          </Group>

          <Group title="Cutting">
            <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
              {field("cutJob", "Job")}
              {field("cutJobNo", "Job No.", { placeholder: "1941/1942" })}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {field("cutPackets", "Pkts")}
              {field("cutSheets", "Sheets")}
            </div>
          </Group>

          <Group title="Balance">
            <div className="grid grid-cols-2 gap-2">
              {field("balancePackets", "Pkts")}
              <div className="grid gap-1.5 self-start">
                <span className="text-sm font-medium">Sheets</span>
                <p
                  className={cn(
                    "flex h-8 items-center rounded-lg border bg-muted/40 px-2.5 text-sm tabular-nums",
                    balance !== null && balance < 0 && "text-destructive",
                  )}
                >
                  {balance === null ? "—" : formatSheets(balance)}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Balance Sheets is worked out as Sheets − Cutting Sheets. Enter Balance Pkts yourself.
            </p>
          </Group>

          {field("remarks", "Remarks")}

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
              {pending ? "Saving…" : row ? "Save changes" : "Add paper"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}
