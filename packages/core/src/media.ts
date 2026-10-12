/**
 * Photo metadata (research/DECISIONS.md, rounds 4 and 6): EXIF and GPS never reach the public.
 * The app re-encodes photos on the device, which already drops them; the server runs this as a
 * backstop for any client that didn't, before a photo is stored.
 */

export type ImageType = "image/jpeg" | "image/webp";

const ascii = (b: Uint8Array, at: number, length: number) => String.fromCharCode(...b.subarray(at, at + length));
const u32le = (b: Uint8Array, at: number) =>
  ((b[at] ?? 0) | ((b[at + 1] ?? 0) << 8) | ((b[at + 2] ?? 0) << 16) | ((b[at + 3] ?? 0) << 24)) >>> 0;

/** The image type from its first bytes, never from the file name or the declared type. */
export function sniffImage(b: Uint8Array): ImageType | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 12 && ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") return "image/webp";
  return null;
}

function concat(parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

const isRestart = (m: number) => m >= 0xd0 && m <= 0xd7;

/**
 * Keeps JFIF (APP0), the colour profile (APP2 "ICC_PROFILE") and Adobe's colour flag (APP14); drops
 * every other APPn (EXIF, XMP, IPTC, maker notes, MPF previews), comments, and anything after the
 * end-of-image marker (some phones append thumbnails or depth maps there).
 */
function stripJpeg(b: Uint8Array): Uint8Array<ArrayBuffer> | null {
  const keep: Uint8Array[] = [b.subarray(0, 2)];
  let i = 2;
  while (i + 1 < b.length) {
    if (b[i] !== 0xff) return null;
    const m = b[i + 1] ?? 0;
    if (m === 0xff) {
      i++;
      continue;
    }
    if (m === 0xd9) {
      keep.push(b.subarray(i, i + 2));
      return concat(keep);
    }
    if (isRestart(m)) {
      keep.push(b.subarray(i, i + 2));
      i += 2;
      continue;
    }
    const length = ((b[i + 2] ?? 0) << 8) | (b[i + 3] ?? 0);
    const end = i + 2 + length;
    if (length < 2 || end > b.length) return null;
    const app = m >= 0xe0 && m <= 0xef;
    const kept =
      m === 0xe0 || m === 0xee || (m === 0xe2 && ascii(b, i + 4, 11) === "ICC_PROFILE") || (!app && m !== 0xfe);
    if (kept) keep.push(b.subarray(i, end));
    i = end;
    if (m === 0xda) {
      // Scan data runs until a marker that is neither a stuffed 0xFF00 nor a restart.
      let j = i;
      while (j + 1 < b.length && !(b[j] === 0xff && b[j + 1] !== 0x00 && !isRestart(b[j + 1] ?? 0))) j++;
      keep.push(b.subarray(i, j));
      i = j;
    }
  }
  return null;
}

/** Drops the EXIF and XMP chunks and clears their flags in the extended header. */
function stripWebp(b: Uint8Array): Uint8Array<ArrayBuffer> | null {
  const keep: Uint8Array[] = [];
  let i = 12;
  while (i + 8 <= b.length) {
    const id = ascii(b, i, 4);
    const size = u32le(b, i + 4);
    // Chunks are padded to an even size; some encoders skip the pad on the last one.
    const end = Math.min(i + 8 + size + (size & 1), b.length);
    if (i + 8 + size > b.length) return null;
    if (id !== "EXIF" && id !== "XMP ") {
      const chunk = b.slice(i, end);
      if (id === "VP8X" && chunk.length > 8) chunk[8] = (chunk[8] ?? 0) & ~0x0c;
      keep.push(chunk);
    }
    i = end;
  }
  if (i !== b.length) return null;
  const body = concat(keep);
  const head = new Uint8Array(12);
  head.set([0x52, 0x49, 0x46, 0x46], 0);
  new DataView(head.buffer).setUint32(4, body.length + 4, true);
  head.set([0x57, 0x45, 0x42, 0x50], 8);
  return concat([head, body]);
}

/** The same image without metadata, or null when it isn't a JPEG or WebP that parses. */
export function stripImageMetadata(b: Uint8Array): { type: ImageType; bytes: Uint8Array<ArrayBuffer> } | null {
  const type = sniffImage(b);
  const bytes = type === "image/jpeg" ? stripJpeg(b) : type === "image/webp" ? stripWebp(b) : null;
  return type && bytes ? { type, bytes } : null;
}
