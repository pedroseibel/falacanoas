import sharp from "sharp";
import { isExposed, isFace, nudenet, plates, ultraface } from "./detectors";
import { nms, pad, pixels, shift, tiles, type Box } from "./geometry";

/**
 * What the service tells the app about one photo (DECISIONS round 20). It sorts the moderator's
 * queue and never decides alone: a likely nude photo is shown blurred to the moderator first; faces
 * and plates are counted so the moderator knows where to look.
 */
export interface Screening {
  /** The highest score among exposed genitals, breasts, buttocks or anus (0–1). */
  nudity: number;
  faces: Box[];
  plates: Box[];
  width: number;
  height: number;
  ms: number;
}

/** Images at least this wide or tall are also searched in quarters, for small faces and plates. */
const TILE_FROM = 1000;

async function tiled(
  bytes: Uint8Array,
  width: number,
  height: number,
  detect: (b: Uint8Array, w: number, h: number) => Promise<Box[]>,
): Promise<Box[]> {
  const whole = detect(bytes, width, height);
  if (Math.max(width, height) < TILE_FROM) return whole;
  const parts = tiles(width, height).map(async (t) => {
    const crop = new Uint8Array(await sharp(bytes).extract(t).toBuffer());
    return (await detect(crop, t.width, t.height)).map((b) => shift(b, t.left, t.top));
  });
  return nms((await Promise.all([whole, ...parts])).flat(), 0.3);
}

export async function screen(bytes: Uint8Array): Promise<Screening> {
  const started = performance.now();
  const meta = await sharp(bytes).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) throw new Error("imagem ilegível");
  const [body, faces, found] = await Promise.all([
    nudenet(bytes, width, height),
    tiled(bytes, width, height, ultraface),
    tiled(bytes, width, height, plates),
  ]);
  // Two detectors see faces: the dedicated one, and NudeNet's face classes (a lower bar). Merge them.
  const allFaces = nms([...faces, ...body.filter((b) => isFace(b) && b.score >= 0.4)], 0.3);
  return {
    nudity: Math.max(0, ...body.filter(isExposed).map((b) => b.score)),
    faces: allFaces,
    plates: found,
    width,
    height,
    ms: Math.round(performance.now() - started),
  };
}

/** How much a box grows before it's blurred: a blur that just covers a face leaves its edges readable. */
const BLUR_PADDING = 1.3;

/**
 * The public copy (round 6, BUILD 2.11): every face and plate blurred, generously, in the same format.
 * Not used by the app until recall is measured on real Canoas photos.
 */
export async function blur(bytes: Uint8Array, boxes: Box[]): Promise<{ bytes: Buffer; type: string }> {
  const image = sharp(bytes);
  const meta = await image.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const patches = await Promise.all(
    boxes.map(async (b) => {
      const region = pixels(pad(b, BLUR_PADDING, width, height), width, height);
      const sigma = Math.max(8, Math.min(region.width, region.height) / 3);
      const input = await sharp(bytes).extract(region).blur(sigma).toBuffer();
      return { input, left: region.left, top: region.top };
    }),
  );
  const webp = meta.format === "webp";
  const out = image.composite(patches);
  return webp
    ? { bytes: await out.webp({ quality: 82 }).toBuffer(), type: "image/webp" }
    : { bytes: await out.jpeg({ quality: 85, mozjpeg: true }).toBuffer(), type: "image/jpeg" };
}
