import { REPORT } from "@fala/core";
import sharp from "sharp";

/**
 * A photo as the report form would send it: upright, at most REPORT.photoEdge px on the longest
 * side, JPEG, without metadata (sharp drops EXIF and GPS unless asked to keep them). WhatsApp already
 * strips most metadata; this makes sure, and keeps "HD" photos under the site's limit. Null if the
 * bytes aren't an image.
 */
export async function readyPhoto(bytes: Uint8Array): Promise<Uint8Array | null> {
  try {
    const out = await sharp(bytes, { limitInputPixels: 50_000_000 })
      .rotate()
      .resize({ width: REPORT.photoEdge, height: REPORT.photoEdge, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    return out.byteLength <= REPORT.photoBytes ? new Uint8Array(out) : null;
  } catch {
    return null;
  }
}
