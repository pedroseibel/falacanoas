import { describe, expect, test } from "bun:test";
import { placeMarkers } from "./markers";

describe("placeMarkers", () => {
  test("markers far apart stay on their points", () => {
    const out = placeMarkers(
      [
        { n: 1, at: [20, 20] },
        { n: 2, at: [80, 80] },
      ],
      5,
      100,
      100,
    );
    expect(out.map((m) => m.moved)).toEqual([false, false]);
    expect(out[1]?.label).toEqual([80, 80]);
  });

  test("a marker that would cover another moves off it, with a leader", () => {
    const [a, b] = placeMarkers(
      [
        { n: 1, at: [50, 50] },
        { n: 2, at: [52, 50] },
      ],
      5,
      100,
      100,
    );
    expect(a?.moved).toBeFalse();
    expect(b?.moved).toBeTrue();
    const [bx, by] = b?.label ?? [0, 0];
    expect(Math.hypot(bx - 50, by - 50)).toBeGreaterThanOrEqual(10);
  });

  test("lower numbers keep their place; nothing leaves the frame", () => {
    const out = placeMarkers(
      [
        { n: 2, at: [6, 6] },
        { n: 1, at: [6, 6] },
      ],
      5,
      100,
      100,
    );
    expect(out[0]?.n).toBe(1);
    expect(out[0]?.moved).toBeFalse();
    for (const m of out) expect(m.label[0] >= 5 && m.label[0] <= 95 && m.label[1] >= 5 && m.label[1] <= 95).toBeTrue();
  });
});
