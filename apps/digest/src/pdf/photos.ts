import sharp from "sharp";

/**
 * Report photos for the PDF: fetched from their public address (only approved photos are public,
 * the same rule the resumo follows, so no Storage secret lives here) and re-encoded as JPEG, which
 * Typst embeds as is (anything else it re-encodes losslessly, and the file balloons).
 */

/**
 * Pixels per photo: every photo prints 40 mm wide (a strip of equal tiles), about 300 dpi at 480 px.
 * A heavy day (hundreds of photos) drops to 400 so the PDF stays near 8 MB, under e-mail limits.
 */
export const photoWidth = (totalInResumo: number) => (totalInResumo > 240 ? 400 : 480);

export type PhotoSource = (url: string) => Promise<Uint8Array | null>;

/** Just the call: tests pass a plain function. */
export type Fetcher = (input: string | URL, init?: RequestInit) => Promise<Response>;

/**
 * Only the site's own photo addresses: one pointing elsewhere is not followed. `base` is where they're
 * fetched from: the site itself in production, the web app's dev server in development.
 */
export function sitePhotos(site: string, base: string = site, fetcher: Fetcher = fetch): PhotoSource {
  const origin = new URL(site).origin;
  return async (url) => {
    const u = new URL(url);
    if (u.origin !== origin) return null;
    try {
      const res = await fetcher(new URL(u.pathname, base), { signal: AbortSignal.timeout(20_000) });
      return res.ok ? new Uint8Array(await res.arrayBuffer()) : null;
    } catch {
      return null;
    }
  };
}

/** A print-ready JPEG, or null if the photo couldn't be read (the PDF says so instead). */
export async function printPhoto(bytes: Uint8Array, width: number): Promise<Uint8Array | null> {
  try {
    const out = await sharp(bytes)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .jpeg({ quality: 75, mozjpeg: true })
      .toBuffer();
    return new Uint8Array(out);
  } catch {
    return null;
  }
}
