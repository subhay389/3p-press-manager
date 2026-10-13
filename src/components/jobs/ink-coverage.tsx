"use client";

import { useRef, useState, useTransition, type ReactNode, type RefObject } from "react";
import { upload } from "@vercel/blob/client";
import { Camera, ExternalLink, FileText, LoaderCircle, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  INK_FILES,
  INK_UPLOAD_ROUTE,
  inkPathname,
  isPdfFile,
  MAX_PDF_BYTES,
  type InkCoverage,
  type InkFile,
} from "@/lib/ink-coverage";
import { shrinkPhoto, UnreadablePhoto } from "@/lib/shrink-photo";
import { cn } from "@/lib/utils";
import { removeInkCoverage, saveInkCoverage } from "@/server/ink-coverage";

type Job = { id: string; jobNo: number; jobName: string; inkCoverage: InkCoverage | null };

/**
 * Add / Replace Ink Coverage: Take photo opens the phone camera; Upload takes a
 * photo or PDF. The file saves as soon as it is picked. Mount with a `key` per job.
 */
export function InkCoverageDialog({ job, onClose }: { job: Job; onClose: () => void }) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = progress !== null;
  const replacing = job.inkCoverage !== null;

  async function onPick(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = ""; // so picking the same file again still fires
    if (!file) return;
    setError(null);
    try {
      const message = isPdfFile(file) ? await savePdf(file) : await savePhoto(file);
      if (!message.ok) {
        setError(message.error);
        return;
      }
      toast.success(message.message);
      onClose();
    } catch (e) {
      setError(
        e instanceof UnreadablePhoto
          ? "This photo can’t be read. Take a new photo, or save it as JPG and upload that."
          : e instanceof FileTooBig
            ? e.message
            : "Couldn’t save. Check the internet connection and try again.",
      );
    } finally {
      setProgress(null);
    }
  }

  async function savePhoto(file: File) {
    setProgress("Preparing photo…");
    const { photo, thumb } = await shrinkPhoto(file);
    const thumbBlob = await send("thumb", thumb, "photo");
    const photoBlob = await send("photo", photo, "photo");
    setProgress("Saving…");
    return saveInkCoverage({ jobId: job.id, kind: "PHOTO", url: photoBlob.url, thumbUrl: thumbBlob.url });
  }

  async function savePdf(file: File) {
    if (file.size > MAX_PDF_BYTES) throw new FileTooBig("This PDF is bigger than 10 MB. Ask for a smaller one.");
    const pdfBlob = await send("pdf", file, "PDF");
    setProgress("Saving…");
    return saveInkCoverage({ jobId: job.id, kind: "PDF", url: pdfBlob.url, thumbUrl: null });
  }

  function send(file: InkFile, body: Blob, what: string) {
    setProgress(`Uploading ${what}…`);
    return upload(inkPathname(job.id, file), body, {
      access: "public",
      handleUploadUrl: INK_UPLOAD_ROUTE,
      contentType: INK_FILES[file].contentType,
      onUploadProgress: ({ percentage }) => {
        // The thumbnail is tiny; only the main file's progress is worth showing.
        if (file !== "thumb") setProgress(`Uploading ${what}… ${Math.round(percentage)}%`);
      },
    });
  }

  const choice = (
    ref: RefObject<HTMLInputElement | null>,
    icon: ReactNode,
    title: string,
    hint: string,
  ) => (
    <button
      type="button"
      disabled={busy}
      onClick={() => ref.current?.click()}
      className="flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition-colors outline-none hover:border-primary hover:bg-brand-soft focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-primary">
        {icon}
      </span>
      <span className="grid gap-0.5">
        <span className="font-medium">{title}</span>
        <span className="text-sm text-muted-foreground">{hint}</span>
      </span>
    </button>
  );

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="sm:max-w-md" showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>
            {replacing ? "Replace" : "Add"} Ink Coverage · Job {job.jobNo}
          </DialogTitle>
          <DialogDescription>
            {job.jobName}
            {replacing && ". The new file replaces the one saved now."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          {choice(cameraRef, <Camera className="size-5" />, "Take photo", "Opens the camera on a phone")}
          {choice(fileRef, <Upload className="size-5" />, "Upload photo or PDF", "For a PDF from email, or a saved photo")}
        </div>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => onPick(e.currentTarget)}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf,.pdf"
          hidden
          onChange={(e) => onPick(e.currentTarget)}
        />

        {busy && (
          <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> {progress}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

class FileTooBig extends Error {}

/** Confirm step for Remove Ink Coverage. */
export function RemoveInkCoverageDialog({ job, onClose }: { job: Job; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const what = job.inkCoverage?.kind === "PDF" ? "PDF" : "photo";
  return (
    <AlertDialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Ink Coverage from job {job.jobNo}?</AlertDialogTitle>
          <AlertDialogDescription>
            The Ink Coverage {what} for {job.jobName} is deleted. You can add a new one afterwards.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Keep it</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              startTransition(async () => {
                const result = await removeInkCoverage(job.id);
                if (result.ok) {
                  toast.success(result.message);
                  onClose();
                } else toast.error(result.error);
              });
            }}
          >
            {pending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * The Ink Coverage cell: a thumbnail that opens the photo, or a PDF tile that
 * opens the PDF in a new tab. Nothing when there is none.
 */
export function InkCoverageThumb({
  job,
  onOpenPhoto,
  className,
}: {
  job: Job;
  onOpenPhoto: () => void;
  className?: string;
}) {
  const ink = job.inkCoverage;
  if (!ink) return null;
  const box = cn(
    "flex size-10 items-center justify-center overflow-hidden rounded-md border bg-card outline-none hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/50",
    className,
  );
  if (ink.kind === "PDF") {
    return (
      <a
        href={ink.url}
        target="_blank"
        rel="noopener"
        className={cn(box, "flex-col gap-0 text-primary")}
        title={`Open the Ink Coverage PDF for job ${job.jobNo}`}
      >
        <FileText className="size-4" aria-hidden="true" />
        <span className="text-[0.6rem] leading-tight font-semibold">PDF</span>
        <span className="sr-only">Open the Ink Coverage PDF for job {job.jobNo}</span>
      </a>
    );
  }
  return (
    <button type="button" onClick={onOpenPhoto} className={box} title={`Open the Ink Coverage photo for job ${job.jobNo}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- already a small thumbnail in Blob */}
      <img
        src={ink.thumbUrl ?? ink.url}
        alt={`Ink Coverage for job ${job.jobNo}`}
        loading="lazy"
        className="size-full object-cover object-top"
      />
    </button>
  );
}

/** The full Ink Coverage photo. "Open full size" gives the phone's own pinch zoom. */
export function InkCoveragePhotoDialog({ job, onClose }: { job: Job; onClose: () => void }) {
  const ink = job.inkCoverage;
  if (!ink) return null;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-1.5rem)] gap-3 overflow-y-auto p-3 sm:max-w-3xl sm:p-4">
        <DialogHeader className="flex-row flex-wrap items-center gap-x-3 gap-y-2 pr-8">
          <div className="mr-auto min-w-0">
            <DialogTitle className="text-navy">Ink Coverage · Job {job.jobNo}</DialogTitle>
            <DialogDescription className="truncate">{job.jobName}</DialogDescription>
          </div>
          <Button asChild size="sm" variant="outline">
            <a href={ink.url} target="_blank" rel="noopener">
              <ExternalLink /> Open full size
            </a>
          </Button>
        </DialogHeader>
        <a href={ink.url} target="_blank" rel="noopener" title="Open full size">
          {/* eslint-disable-next-line @next/next/no-img-element -- the stored photo, already shrunk */}
          <img src={ink.url} alt={`Ink Coverage for job ${job.jobNo}`} className="w-full rounded-md border" />
        </a>
      </DialogContent>
    </Dialog>
  );
}
