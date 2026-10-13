// Ink Coverage: one photo or PDF per job, uploaded from the browser straight to
// Vercel Blob (so large PDFs skip the function body limit), then saved on the
// job by a server action. Shared by the client, the upload route and the action.

export type InkCoverageKind = "PHOTO" | "PDF";

export type InkCoverage = { kind: InkCoverageKind; url: string; thumbUrl: string | null };

/** Where the upload route sends the browser for an upload token. */
export const INK_UPLOAD_ROUTE = "/api/ink-coverage";

/** Shrunk photos stay readable when zoomed: the zone numbers on the sheet are small. */
export const PHOTO_MAX_SIDE = 2400;
export const PHOTO_QUALITY = 0.85;
export const THUMB_MAX_SIDE = 240;
export const THUMB_QUALITY = 0.7;

export const MAX_PDF_BYTES = 10 * 1024 * 1024;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

/** What each upload is; the file name the browser asks for, before Blob adds its random suffix. */
export const INK_FILES = {
  photo: { name: "photo.jpg", contentType: "image/jpeg", maxBytes: MAX_PHOTO_BYTES },
  thumb: { name: "thumb.jpg", contentType: "image/jpeg", maxBytes: MAX_PHOTO_BYTES },
  pdf: { name: "ink-coverage.pdf", contentType: "application/pdf", maxBytes: MAX_PDF_BYTES },
} as const;

export type InkFile = keyof typeof INK_FILES;

const PREFIX = "ink-coverage/";

export function inkPathname(jobId: string, file: InkFile) {
  return `${PREFIX}${jobId}/${INK_FILES[file].name}`;
}

/** Reads a pathname the browser asked to upload to. Null unless it is one of ours. */
export function parseInkPathname(pathname: string): { jobId: string; file: InkFile } | null {
  const m = /^ink-coverage\/([A-Za-z0-9_-]{1,40})\/([a-z-]+\.(?:jpg|pdf))$/.exec(pathname);
  if (!m) return null;
  const file = (Object.keys(INK_FILES) as InkFile[]).find((f) => INK_FILES[f].name === m[2]);
  return file ? { jobId: m[1], file } : null;
}

/** True for a Vercel Blob URL uploaded for this job (any random suffix). */
export function isJobBlobUrl(url: string, jobId: string) {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  return (
    u.protocol === "https:" &&
    u.hostname.endsWith(".public.blob.vercel-storage.com") &&
    u.pathname.startsWith(`/${PREFIX}${jobId}/`)
  );
}

export function isPdfFile(file: { type: string; name: string }) {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

export function inkCoverageOf(job: {
  inkCoverageKind: string | null;
  inkCoverageUrl: string | null;
  inkCoverageThumbUrl: string | null;
}): InkCoverage | null {
  const { inkCoverageKind: kind, inkCoverageUrl: url } = job;
  if (!url || (kind !== "PHOTO" && kind !== "PDF")) return null;
  return { kind, url, thumbUrl: job.inkCoverageThumbUrl };
}
