import { PHOTO_MAX_SIDE, PHOTO_QUALITY, THUMB_MAX_SIDE, THUMB_QUALITY } from "@/lib/ink-coverage";

// Browser only. Shrinks a camera photo before upload: a 3–8 MB phone photo
// becomes a ~0.5–1 MB JPEG plus a ~10 KB thumbnail for Job Records.

export class UnreadablePhoto extends Error {}

export async function shrinkPhoto(file: File): Promise<{ photo: Blob; thumb: Blob }> {
  let bitmap: ImageBitmap;
  try {
    // Turns the photo upright from its camera orientation.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new UnreadablePhoto();
  }
  try {
    return {
      photo: await toJpeg(bitmap, PHOTO_MAX_SIDE, PHOTO_QUALITY),
      thumb: await toJpeg(bitmap, THUMB_MAX_SIDE, THUMB_QUALITY),
    };
  } finally {
    bitmap.close();
  }
}

function toJpeg(bitmap: ImageBitmap, maxSide: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  // JPEG has no transparency: a PNG screenshot gets white behind it, not black.
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new UnreadablePhoto())), "image/jpeg", quality),
  );
}
