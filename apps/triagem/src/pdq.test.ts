import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import sharp, { type Sharp } from "sharp";
import { PDQ_MIN_QUALITY, hamming, pdq, toBase64 } from "./pdq";

const image = (name: string) => new Uint8Array(readFileSync(new URL(`../test/pdq/${name}`, import.meta.url)));

/** The reference Python implementation's output for Meta's test images (test/pdq/SOURCE.md). */
const REFERENCE: Record<string, string> = {
  "aaa-orig.jpg": "d8f8f0cce0f4a84f0e370a22028f67f0b36e2ed596623e1d33e6b39c4e9c9b22",
  "blur-a-lot.jpg": "d8f8f0cce0f4e84f0637022a028f67f0b36e2ed596623e1d33e6b39c4e9c9b22",
  "shrink-a-lot.jpg": "d0f8f1ccc0f4a84d0a370a3a228f67f0b36e2ed5b6623e1d33e6339c4e9c9b22",
};

/** Meta's suggested starting threshold for a near match. */
const MATCH = 31;

describe("pdq", () => {
  test("agrees with Meta's reference implementation to within a few bits", async () => {
    const results = await Promise.all(
      Object.entries(REFERENCE).map(async ([name, expected]) => ({ expected, hash: (await pdq(image(name))).hash })),
    );
    for (const { expected, hash } of results) {
      // Decoders and resizers differ slightly; Meta's own Java and Python ports differ by a few bits too.
      expect(hamming(hash.hex, expected)).toBeLessThanOrEqual(4);
      expect(hash.quality).toBe(100);
    }
  });

  test("survives what our upload pipeline does to a photo: shrink to 1600 px, WebP", async () => {
    const original = image("aaa-orig.jpg");
    const webp = new Uint8Array(
      await sharp(original).resize(1600, 1600, { fit: "inside" }).webp({ quality: 82 }).toBuffer(),
    );
    expect(hamming((await pdq(webp)).hash.hex, (await pdq(original)).hash.hex)).toBeLessThanOrEqual(6);
  });

  test("a rotated or mirrored copy still matches one of the eight orientations", async () => {
    const original = image("aaa-orig.jpg");
    const { orientations } = await pdq(original);
    expect(orientations).toHaveLength(8);
    const turns = [
      (s: Sharp) => s.rotate(90),
      (s: Sharp) => s.rotate(180),
      (s: Sharp) => s.rotate(270),
      (s: Sharp) => s.flip(),
      (s: Sharp) => s.flop(),
      (s: Sharp) => s.rotate(90).flop(),
      (s: Sharp) => s.rotate(90).flip(),
    ];
    const copies = await Promise.all(
      turns.map(
        async (turn) => (await pdq(new Uint8Array(await turn(sharp(original)).webp({ quality: 82 }).toBuffer()))).hash,
      ),
    );
    for (const hash of copies)
      expect(Math.min(...orientations.map((o) => hamming(o, hash.hex)))).toBeLessThanOrEqual(MATCH);
  });

  test("unrelated images are far apart, and a flat image has low quality", async () => {
    const noise = new Uint8Array(
      await sharp(Buffer.from(Array.from({ length: 256 * 256 * 3 }, (_, i) => (i * 7919) % 251)), {
        raw: { width: 256, height: 256, channels: 3 },
      })
        .png()
        .toBuffer(),
    );
    const flat = new Uint8Array(
      await sharp({ create: { width: 200, height: 200, channels: 3, background: "#777777" } })
        .png()
        .toBuffer(),
    );
    expect(hamming((await pdq(noise)).hash.hex, (await pdq(image("aaa-orig.jpg"))).hash.hex)).toBeGreaterThan(MATCH);
    expect((await pdq(flat)).hash.quality).toBeLessThan(PDQ_MIN_QUALITY);
  });

  test("hamming and base64: 32 bytes, in the hex string's order", () => {
    expect(hamming("0".repeat(64), "f".repeat(64))).toBe(256);
    const reference = REFERENCE["aaa-orig.jpg"] ?? "";
    expect(hamming(reference, reference)).toBe(0);
    const b64 = toBase64(reference);
    expect(Buffer.from(b64, "base64").length).toBe(32);
    expect(Buffer.from(b64, "base64").toString("hex")).toBe(reference);
  });
});
