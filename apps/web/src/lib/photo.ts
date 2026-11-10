import { REPORT } from "@fala/core";

const encode = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b?.type === type ? b : null), type, quality));

/**
 * Re-encodes a photo on the device before it is sent (research/DECISIONS.md, rounds 4 and 6): at most
 * 1600 px on the long edge, WebP, or JPEG where the browser can't encode WebP (older Safari). Drawing
 * to a canvas keeps only the pixels, so EXIF and GPS never leave the phone.
 */
export async function preparePhoto(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const { width, height } = fitWithin(bitmap.width, bitmap.height, REPORT.photoEdge);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Sem canvas para preparar a foto.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = (await encode(canvas, "image/webp", 0.82)) ?? (await encode(canvas, "image/jpeg", 0.85));
  if (!blob) throw new Error("Não deu para preparar a foto.");
  // A random name replaces the original (which can carry a date or a device name) and keys the preview.
  const name = `foto-${crypto.randomUUID().slice(0, 8)}.${blob.type === "image/webp" ? "webp" : "jpg"}`;
  return new File([blob], name, { type: blob.type });
}

export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
