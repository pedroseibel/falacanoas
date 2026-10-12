import { describe, expect, test } from "bun:test";
import { sniffImage, stripImageMetadata } from "./media";

const bytes = (...parts: (number[] | string)[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)));
const segment = (marker: number, payload: number[] | string) => {
  const body = bytes(payload);
  return [0xff, marker, (body.length + 2) >> 8, (body.length + 2) & 0xff, ...body];
};
const has = (b: Uint8Array, s: string) => new TextDecoder("latin1").decode(b).includes(s);

describe("JPEG", () => {
  const jpeg = bytes(
    [0xff, 0xd8],
    segment(0xe0, "JFIF\0"),
    segment(0xe1, "Exif\0\0GPS-31.95"),
    segment(0xe1, "http://ns.adobe.com/xap/1.0/\0<xmp/>"),
    segment(0xe2, "ICC_PROFILE\0profile"),
    segment(0xfe, "comentário"),
    segment(0xdb, [0, 1, 2]),
    segment(0xda, [1, 2, 3]),
    [0x11, 0xff, 0x00, 0x22, 0xff, 0xd0, 0x33],
    [0xff, 0xd9],
    "TRAILER-THUMBNAIL",
  );
  const out = stripImageMetadata(jpeg);
  test("is recognised by its bytes", () => expect(sniffImage(jpeg)).toBe("image/jpeg"));
  test("drops EXIF, XMP, comments and anything after the image", () => {
    expect(out?.type).toBe("image/jpeg");
    for (const s of ["Exif", "GPS", "xap", "comentário", "TRAILER"]) expect(has(out?.bytes ?? jpeg, s)).toBeFalse();
  });
  test("keeps JFIF, the colour profile and the image data, stuffed bytes and restarts included", () => {
    expect(has(out?.bytes ?? new Uint8Array(), "JFIF")).toBeTrue();
    expect(has(out?.bytes ?? new Uint8Array(), "ICC_PROFILE")).toBeTrue();
    expect(Array.from((out?.bytes ?? new Uint8Array()).slice(-9))).toEqual([
      0x11, 0xff, 0x00, 0x22, 0xff, 0xd0, 0x33, 0xff, 0xd9,
    ]);
  });
  test("a truncated file is refused", () => expect(stripImageMetadata(jpeg.slice(0, 30))).toBeNull());
});

describe("WebP", () => {
  const chunk = (id: string, payload: number[]) => {
    const pad = payload.length & 1 ? [0] : [];
    const n = payload.length;
    return [...bytes(id), n & 0xff, (n >> 8) & 0xff, 0, 0, ...payload, ...pad];
  };
  const body = [
    ...chunk("VP8X", [0x0c | 0x10, 0, 0, 0, 1, 0, 0, 1, 0, 0]),
    ...chunk("VP8 ", [9, 9, 9]),
    ...chunk("EXIF", [...bytes("GPS")]),
    ...chunk("XMP ", [...bytes("<x/>")]),
  ];
  const n = body.length + 4;
  const webp = bytes("RIFF", [n & 0xff, (n >> 8) & 0xff, 0, 0], "WEBP", body);
  const out = stripImageMetadata(webp)?.bytes ?? new Uint8Array();
  test("is recognised by its bytes", () => expect(sniffImage(webp)).toBe("image/webp"));
  test("drops the EXIF and XMP chunks and their flags", () => {
    expect(has(out, "GPS")).toBeFalse();
    expect(has(out, "XMP")).toBeFalse();
    expect(out[20]).toBe(0x10);
  });
  test("rewrites the RIFF size", () => expect(new DataView(out.buffer).getUint32(4, true)).toBe(out.length - 8));
});

test("anything else is refused", () => {
  expect(sniffImage(bytes("GIF89a"))).toBeNull();
  expect(stripImageMetadata(bytes([0x89], "PNG\r\n"))).toBeNull();
});
