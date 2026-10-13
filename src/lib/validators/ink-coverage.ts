import { z } from "zod";
import { isJobBlobUrl } from "@/lib/ink-coverage";

/** A file the browser has just uploaded to Vercel Blob for this job. */
export const inkCoverageSchema = z
  .object({
    jobId: z.string().min(1),
    kind: z.enum(["PHOTO", "PDF"]),
    url: z.string(),
    thumbUrl: z.string().nullable().default(null),
  })
  .refine((v) => isJobBlobUrl(v.url, v.jobId) && (v.thumbUrl === null || isJobBlobUrl(v.thumbUrl, v.jobId)), {
    message: "The upload didn’t finish. Please try again.",
  })
  .refine((v) => (v.kind === "PHOTO") === (v.thumbUrl !== null), { message: "Invalid upload." });
