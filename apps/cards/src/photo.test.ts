import { describe, expect, test } from "bun:test";
import { cardPhoto, cover, crc32, dataUrlBytes, encodePng, parseDataUrl, toDataUrl } from "./photo";

/** Pixels from a function of the coordinates, opaque. */
function image(width: number, height: number, rgb: (x: number, y: number) => [number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data.set([...rgb(x, y), 255], (y * width + x) * 4);
  return { data, width, height };
}

test("crc32 matches the standard check value", () => {
  expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
});

test("data URLs go both ways", () => {
  expect(new Uint8Array(dataUrlBytes("data:font/ttf;base64,AAEC"))).toEqual(new Uint8Array([0, 1, 2]));
  const bytes = new Uint8Array([0, 1, 2, 250, 255]);
  expect(parseDataUrl(toDataUrl("image/png", bytes))).toEqual({ type: "image/png", bytes });
  expect(parseDataUrl("data:text/plain;base64,AAAA")).toBeNull();
});

describe("cover", () => {
  test("fills the box from the middle: a wide image loses its sides", () => {
    // Left third red, middle green, right third blue; the square crop keeps the middle.
    const wide = image(30, 10, (x) => (x < 10 ? [255, 0, 0] : x < 20 ? [0, 255, 0] : [0, 0, 255]));
    const out = cover(wide, 4, 4);
    expect(out.length).toBe(4 * 4 * 3);
    for (let i = 0; i < 16; i++) expect([out[i * 3], out[i * 3 + 1], out[i * 3 + 2]]).toEqual([0, 255, 0]);
  });

  test("a flat colour stays flat at any scale", () => {
    const grey = image(7, 5, () => [120, 120, 120]);
    expect([...cover(grey, 20, 13)].every((v) => v === 120)).toBeTrue();
  });
});

test("encodePng writes a valid header and pixels that inflate back", async () => {
  const rgb = new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255, 9, 9, 9]);
  const png = await encodePng(rgb, 2, 2);
  expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const view = new DataView(png.buffer);
  expect(new TextDecoder().decode(png.subarray(12, 16))).toBe("IHDR");
  expect([view.getUint32(16), view.getUint32(20), png[24], png[25]]).toEqual([2, 2, 8, 2]);
  expect(view.getUint32(29)).toBe(crc32(png.subarray(12, 29)));
  const idatLength = view.getUint32(33);
  const idat = png.subarray(41, 41 + idatLength);
  const raw = new Uint8Array(
    await new Response(
      new Blob([new Uint8Array(idat)]).stream().pipeThrough(new DecompressionStream("deflate")),
    ).arrayBuffer(),
  );
  expect([...raw]).toEqual([0, 255, 0, 0, 0, 255, 0, 0, 0, 0, 255, 9, 9, 9]);
});

const decode = async () => image(8, 8, () => [10, 20, 30]);

describe("cardPhoto", () => {
  const size = { width: 4, height: 4 };

  test("JPEG and PNG pass through untouched", async () => {
    const jpeg = toDataUrl("image/jpeg", new Uint8Array([0xff, 0xd8, 0xff]));
    expect(await cardPhoto(jpeg, size, decode)).toBe(jpeg);
  });

  test("WebP comes back as a PNG of the requested size", async () => {
    const out = await cardPhoto(toDataUrl("image/webp", new Uint8Array([1, 2, 3])), size, decode);
    const png = out ? parseDataUrl(out) : null;
    expect(png?.type).toBe("image/png");
    expect(png ? new DataView(png.bytes.buffer).getUint32(16) : 0).toBe(4);
  });

  test("an unreadable photo is dropped, not drawn broken", async () => {
    expect(await cardPhoto("data:image/webp;base64,AAAA", size, () => Promise.reject(new Error("x")))).toBeNull();
    expect(await cardPhoto("https://example.com/x.webp", size, decode)).toBeNull();
  });
});
