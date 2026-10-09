"use client";

import { useState, useTransition } from "react";
import { SlidersHorizontal } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatSheets } from "@/lib/paper";
import { adjustStock } from "@/server/paper";

/** Sets the balance to a counted number; the app records the difference. */
export function AdjustStockDialog({
  paperTypeId,
  balance,
  today,
}: {
  paperTypeId: string;
  balance: number;
  today: string;
}) {
  const [open, setOpen] = useState(false);
  const [newBalance, setNewBalance] = useState("");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const diff = newBalance === "" ? null : Number(newBalance) - balance;

  function reset() {
    setNewBalance("");
    setReason("");
    setDate(today);
    setError(null);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const result = await adjustStock({ paperTypeId, newBalance, reason, date });
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
        <Button variant="outline">
          <SlidersHorizontal /> Adjust stock
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Adjust stock</DialogTitle>
            <DialogDescription>
              Enter the real number of sheets, e.g. after a count or to correct a wrong entry.
              Nothing is deleted: a correction row is added to the ledger.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5 self-start">
              <Label>Current balance</Label>
              <div className="flex h-8 items-center text-sm font-medium tabular-nums">
                {formatSheets(balance)} sheets
              </div>
            </div>
            <div className="grid gap-1.5 self-start">
              <Label htmlFor="as-balance">New balance</Label>
              <Input
                id="as-balance"
                inputMode="numeric"
                autoComplete="off"
                value={newBalance}
                onChange={(e) => {
                  setNewBalance(e.target.value.replace(/\D/g, ""));
                  setError(null);
                }}
                required
                autoFocus
              />
              {diff !== null && diff !== 0 && (
                <p className="text-xs text-muted-foreground tabular-nums">
                  {diff > 0 ? "+" : "−"}
                  {formatSheets(Math.abs(diff))} sheets
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="as-reason">Reason</Label>
            <Input
              id="as-reason"
              placeholder="e.g. Physical count, or wrong entry on 2083/06/20"
              autoComplete="off"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="as-date">Date</Label>
            <BsDateInput id="as-date" value={date} onChange={setDate} required />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save adjustment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
