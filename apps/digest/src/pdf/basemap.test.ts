import { describe, expect, test } from "bun:test";
import { nearestStreet, streetLabels } from "./basemap";
import { boxAround, toTile, type LngLat } from "./geo";

const pin: LngLat = [-51.18205, -29.91611];
const [px, py] = toTile(pin);
const unit = boxAround(pin, 100, 100).x1 - px; // 50 m in tile units
// An east-west street through the pin, and a north-south one 100 m east.
const lines = [
  {
    name: "Rua Ipiranga",
    points: [[px - 6 * unit, py] satisfies [number, number], [px + 6 * unit, py] satisfies [number, number]],
  },
  {
    name: "Rua Tiradentes",
    points: [
      [px + 2 * unit, py - 6 * unit] satisfies [number, number],
      [px + 2 * unit, py + 6 * unit] satisfies [number, number],
    ],
  },
];

describe("streets near a pin", () => {
  test("the nearest named street, in metres; none when nothing named is close", () => {
    expect(nearestStreet(lines, pin)).toEqual({ name: "Rua Ipiranga", metres: 0 });
    const far: LngLat = [pin[0], pin[1] + 0.002]; // about 220 m north
    expect(nearestStreet(lines, far)).toBeNull();
  });

  test("the pin's own street is labelled beside the pin, not on it; nearest streets first", () => {
    const labels = streetLabels(lines, boxAround(pin, 360, 216), pin);
    expect(labels.map((l) => l.name)).toEqual(["Rua Ipiranga", "Rua Tiradentes"]);
    const own = labels[0];
    expect(Math.hypot((own?.at[0] ?? 0) - 0.5, (own?.at[1] ?? 0) - 0.5)).toBeGreaterThanOrEqual(0.13);
    expect(own?.angle).toBeCloseTo(0, 5);
    expect(Math.abs(labels[1]?.angle ?? 0)).toBeCloseTo(90, 5);
  });
});
