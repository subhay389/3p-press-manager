import { describe, expect, it } from "vitest";
import { inkCoverageOf, inkPathname, isJobBlobUrl, isPdfFile, parseInkPathname } from "@/lib/ink-coverage";
import { inkCoverageSchema } from "@/lib/validators/ink-coverage";

const JOB = "cmg1abc2def3ghi4jkl5mno6";
const blob = (path: string) => `https://abc123xyz.public.blob.vercel-storage.com/${path}`;

describe("Ink Coverage paths", () => {
  it("round-trips the pathnames the browser asks for", () => {
    for (const file of ["photo", "thumb", "pdf"] as const) {
      expect(parseInkPathname(inkPathname(JOB, file))).toEqual({ jobId: JOB, file });
    }
  });

  it("rejects anything else", () => {
    expect(parseInkPathname(`ink-coverage/${JOB}/other.jpg`)).toBeNull();
    expect(parseInkPathname(`ink-coverage/../x/photo.jpg`)).toBeNull();
    expect(parseInkPathname(`elsewhere/${JOB}/photo.jpg`)).toBeNull();
    expect(parseInkPathname(`ink-coverage/${JOB}/photo.jpg/x`)).toBeNull();
  });

  it("accepts only this job's Blob URLs", () => {
    expect(isJobBlobUrl(blob(`ink-coverage/${JOB}/photo-AbC123.jpg`), JOB)).toBe(true);
    expect(isJobBlobUrl(blob(`ink-coverage/otherjob/photo-AbC123.jpg`), JOB)).toBe(false);
    expect(isJobBlobUrl(`https://example.com/ink-coverage/${JOB}/photo.jpg`, JOB)).toBe(false);
    expect(isJobBlobUrl(`http://abc.public.blob.vercel-storage.com/ink-coverage/${JOB}/p.jpg`, JOB)).toBe(false);
    expect(isJobBlobUrl("not a url", JOB)).toBe(false);
  });

  it("spots PDFs by type or name", () => {
    expect(isPdfFile({ type: "application/pdf", name: "x" })).toBe(true);
    expect(isPdfFile({ type: "", name: "6x6x4.5Bakery.PDF" })).toBe(true);
    expect(isPdfFile({ type: "image/jpeg", name: "IMG_1.jpg" })).toBe(false);
  });

  it("reads the stored columns", () => {
    expect(inkCoverageOf({ inkCoverageKind: null, inkCoverageUrl: null, inkCoverageThumbUrl: null })).toBeNull();
    expect(inkCoverageOf({ inkCoverageKind: "PDF", inkCoverageUrl: "u", inkCoverageThumbUrl: null })).toEqual({
      kind: "PDF",
      url: "u",
      thumbUrl: null,
    });
  });
});

describe("inkCoverageSchema", () => {
  const photo = {
    jobId: JOB,
    kind: "PHOTO",
    url: blob(`ink-coverage/${JOB}/photo-a1.jpg`),
    thumbUrl: blob(`ink-coverage/${JOB}/thumb-b2.jpg`),
  };

  it("accepts a photo with its thumbnail and a PDF without", () => {
    expect(inkCoverageSchema.safeParse(photo).success).toBe(true);
    expect(
      inkCoverageSchema.safeParse({ jobId: JOB, kind: "PDF", url: blob(`ink-coverage/${JOB}/ink-coverage-c3.pdf`) })
        .success,
    ).toBe(true);
  });

  it("rejects another job's file, or a photo without a thumbnail", () => {
    expect(inkCoverageSchema.safeParse({ ...photo, jobId: "otherjob" }).success).toBe(false);
    expect(inkCoverageSchema.safeParse({ ...photo, thumbUrl: null }).success).toBe(false);
  });
});
