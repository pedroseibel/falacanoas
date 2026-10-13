/**
 * The pin's photo, ready for Satori and resvg, which read PNG and JPEG but not WebP (what most
 * phones upload). A WebP is decoded, cropped to fill the tray the way `object-fit: cover` would, and
 * re-encoded as PNG with the platform's deflate. Plain functions, so they run in Bun's tests too.
 */

export interface Pixels {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

const DATA_URL = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/;

export function parseDataUrl(url: string): { type: string; bytes: Uint8Array } | null {
  const m = DATA_URL.exec(url);
  if (!m?.[1] || !m[2]) return null;
  return { type: m[1], bytes: Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0)) };
}

/** The bytes of any base64 data URL (Vite's `?inline` assets included). */
export function dataUrlBytes(url: string): ArrayBuffer {
  const b64 = url.slice(url.indexOf(",") + 1);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;
}

export function toDataUrl(type: string, bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${type};base64,${btoa(bin)}`;
}

/** RGB pixels `width`×`height`, cut from the middle of `src` and scaled to fill (bilinear). */
export function cover(src: Pixels, width: number, height: number): Uint8Array {
  const scale = Math.max(width / src.width, height / src.height);
  const ox = (src.width - width / scale) / 2;
  const oy = (src.height - height / scale) / 2;
  const out = new Uint8Array(width * height * 3);
  const at = (x: number, y: number, c: number) => src.data[(y * src.width + x) * 4 + c] ?? 0;
  for (let y = 0; y < height; y++) {
    const sy = Math.min(src.height - 1, Math.max(0, oy + (y + 0.5) / scale - 0.5));
    const y0 = Math.floor(sy);
    const y1 = Math.min(src.height - 1, y0 + 1);
    const fy = sy - y0;
    for (let x = 0; x < width; x++) {
      const sx = Math.min(src.width - 1, Math.max(0, ox + (x + 0.5) / scale - 0.5));
      const x0 = Math.floor(sx);
      const x1 = Math.min(src.width - 1, x0 + 1);
      const fx = sx - x0;
      for (let c = 0; c < 3; c++) {
        const top = at(x0, y0, c) * (1 - fx) + at(x1, y0, c) * fx;
        const bottom = at(x0, y1, c) * (1 - fx) + at(x1, y1, c) * fx;
        out[(y * width + x) * 3 + c] = Math.round(top * (1 - fy) + bottom * fy);
      }
    }
  }
  return out;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = (CRC_TABLE[(c ^ b) & 0xff] ?? 0) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(new TextEncoder().encode(type), 4);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([new Uint8Array(bytes)]).stream().pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** An 8-bit RGB PNG, no filtering: small enough for a card-sized photo, and quick. */
export async function encodePng(rgb: Uint8Array, width: number, height: number): Promise<Uint8Array> {
  const raw = new Uint8Array(height * (width * 3 + 1));
  for (let y = 0; y < height; y++) raw.set(rgb.subarray(y * width * 3, (y + 1) * width * 3), y * (width * 3 + 1) + 1);
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  header.set([8, 2, 0, 0, 0], 8);
  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", await deflate(raw)),
    chunk("IEND", new Uint8Array()),
  ];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

/**
 * The photo as Satori can take it: PNG and JPEG pass through; a WebP is decoded with `decodeWebp`,
 * covered to `width`×`height`, and returned as a PNG. Null if it can't be read.
 */
export async function cardPhoto(
  url: string,
  size: { width: number; height: number },
  decodeWebp: (bytes: ArrayBuffer) => Promise<Pixels>,
): Promise<string | null> {
  const parsed = parseDataUrl(url);
  if (!parsed) return null;
  if (parsed.type !== "image/webp") return url;
  const pixels = await decodeWebp(parsed.bytes.slice().buffer).catch(() => null);
  if (!pixels) return null;
  return toDataUrl("image/png", await encodePng(cover(pixels, size.width, size.height), size.width, size.height));
}
