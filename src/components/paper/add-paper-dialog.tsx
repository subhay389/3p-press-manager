"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { BsDateInput } from "@/components/bs-date-input";
import {
  matchPaperType,
  PaperTypeFields,
  type KnownPaperType,
  type PaperTypeValue,
} from "@/components/paper/paper-type-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { paperTypeLabel } from "@/lib/paper";
import { addPaper } from "@/server/paper";

const EMPTY_TYPE: PaperTypeValue = { client: "", category: "", gsm: "", size: "" };

/**
 * Records paper received into 3P stock, or a client's paper with `forClient`.
 * With `fixedType`, the paper type is locked (used on a ledger page);
 * otherwise it can be picked or created.
 */
export function AddPaperDialog({
  known,
  today,
  fixedType,
  forClient = false,
}: {
  known: KnownPaperType[];
  today: string;
  fixedType?: KnownPaperType;
  forClient?: boolean;
}) {
  const initialType = fixedType
    ? {
        client: fixedType.client ?? "",
        category: fixedType.category,
        gsm: String(fixedType.gsm),
        size: fixedType.size,
      }
    : EMPTY_TYPE;
  // Particulars is asked (and required) for 3P receipts only.
  const isClient = forClient || !!fixedType?.client;
  const fixedLabel = fixedType && `${fixedType.client ? `${fixedType.client}: ` : ""}${paperTypeLabel(fixedType)}`;

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<PaperTypeValue>(initialType);
  const [date, setDate] = useState(today);
  const [particulars, setParticulars] = useState("");
  const [packets, setPackets] = useState("");
  const [sheets, setSheets] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isNewType =
    !fixedType &&
    (!forClient || type.client.trim() !== "") &&
    type.category.trim() !== "" &&
    type.size.trim() !== "" &&
    Number(type.gsm) > 0 &&
    !matchPaperType(known, type);

  function reset() {
    setType(initialType);
    setDate(today);
    setParticulars("");
    setPackets("");
    setSheets("");
    setRemarks("");
    setError(null);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addPaper({ ...type, date, particulars, packets, sheets, remarks });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(result.message);
      reset();
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus /> Add paper
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Add paper</DialogTitle>
            <DialogDescription>
              {fixedLabel
                ? `Record paper received for ${fixedLabel}.`
                : forClient
                  ? "Record paper a client brought in. Their jobs take sheets from it."
                  : "Record paper received into 3P stock. Use Particulars “Opening stock” for the first entry of a paper type."}
            </DialogDescription>
          </DialogHeader>

          {fixedType ? (
            <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm font-medium">
              {fixedLabel}
            </div>
          ) : (
            <PaperTypeFields known={known} value={type} onChange={setType} withClient={forClient} />
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="ap-date">Date</Label>
              <BsDateInput id="ap-date" value={date} onChange={setDate} required />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5 self-start">
                <Label htmlFor="ap-pkts">
                  Pkts <span className="font-normal text-muted-foreground">(opt.)</span>
                </Label>
                <Input
                  id="ap-pkts"
                  inputMode="numeric"
                  autoComplete="off"
                  value={packets}
                  onChange={(e) => setPackets(e.target.value.replace(/\D/g, ""))}
                />
              </div>
              <div className="grid gap-1.5 self-start">
                <Label htmlFor="ap-sheets">Sheets</Label>
                <Input
                  id="ap-sheets"
                  inputMode="numeric"
                  autoComplete="off"
                  value={sheets}
                  onChange={(e) => setSheets(e.target.value.replace(/\D/g, ""))}
                  required
                />
              </div>
            </div>
          </div>

          {/* 3P only: client paper's ledger column is the Job, filled in by their jobs. */}
          {!isClient && (
            <div className="grid gap-1.5">
              <Label htmlFor="ap-particulars">Particulars</Label>
              <Input
                id="ap-particulars"
                placeholder="Supplier, bill no., or “Opening stock”"
                autoComplete="off"
                value={particulars}
                onChange={(e) => setParticulars(e.target.value)}
                required
              />
            </div>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="ap-remarks">
              Remarks <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="ap-remarks"
              autoComplete="off"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isNewType ? "Add new paper type and paper" : "Add paper"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
