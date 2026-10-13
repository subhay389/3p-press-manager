import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { INK_FILES, parseInkPathname } from "@/lib/ink-coverage";

// Hands the browser a short-lived token to upload one Ink Coverage file straight
// to Vercel Blob. The job is updated afterwards by saveInkCoverage.
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        await assertAdmin();
        const target = parseInkPathname(pathname);
        if (!target) throw new Error("Not an Ink Coverage file.");
        const job = await db.job.count({ where: { id: target.jobId } });
        if (!job) throw new Error("This job no longer exists.");
        const { contentType, maxBytes } = INK_FILES[target.file];
        // The random suffix keeps the public link unguessable.
        return { allowedContentTypes: [contentType], maximumSizeInBytes: maxBytes, addRandomSuffix: true };
      },
    });
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed." }, { status: 400 });
  }
}
