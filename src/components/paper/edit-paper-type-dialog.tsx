"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
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
import { paperTypeLabel } from "@/lib/paper";
import { updatePaperType } from "@/server/paper";

/** Fixes a typo in a paper type's category, GSM or size. */
export function EditPaperTypeDialog({
  paperType,
  known,
}: {
  paperType: KnownPaperType;
  known: KnownPaperType[];
}) {
  const initial = {
    category: paperType.category,
    gsm: String(paperType.gsm),
    size: paperType.size,
  };
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<PaperTypeValue>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const others = known.filter((k) => k.id !== paperType.id);
  const clash = matchPaperType(others, value);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updatePaperType({ id: paperType.id, ...value });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(result.message);
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setValue(initial);
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost">
          <Pencil /> Edit type
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Edit paper type</DialogTitle>
            <DialogDescription>
              Fix a typo in {paperTypeLabel(paperType)}. Its ledger and balance stay the same.
            </DialogDescription>
          </DialogHeader>

          <PaperTypeFields
            known={known}
            value={value}
            onChange={(v) => {
              setValue(v);
              setError(null);
            }}
            excludeId={paperType.id}
            showStatus={false}
          />

          {clash && (
            <p role="alert" className="text-sm text-destructive">
              {paperTypeLabel(clash)} already exists. Pick a different combination.
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending || !!clash}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
