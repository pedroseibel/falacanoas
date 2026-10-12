import { describe, expect, test } from "bun:test";
import { distance, relativeTime, dateAgo } from "./format";
import { haversine, neighborhoodAt, pointInGeometry } from "./geo";
import type { NeighborhoodCollection } from "./types";

const square: NeighborhoodCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { slug: "quadrado", name: "Quadrado" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
          [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]],
        ],
      },
    },
  ],
};

describe("geo", () => {
  test("haversine: one degree of latitude is about 111 km", () =>
    expect(Math.round(haversine([0, 0], [0, 1]) / 1000)).toBe(111));
  test("inside the polygon", () => expect(pointInGeometry([1, 1], square.features[0]!.geometry)).toBeTrue());
  test("holes are respected", () => expect(pointInGeometry([5, 5], square.features[0]!.geometry)).toBeFalse());
  test("bairro lookup by point", () => {
    expect(neighborhoodAt([2, 8], square)).toBe("quadrado");
    expect(neighborhoodAt([20, 20], square)).toBeNull();
  });
});

describe("format (pt-BR)", () => {
  test("relative time", () => {
    expect(relativeTime(0)).toBe("agora");
    expect(relativeTime(38)).toBe("há 38 min");
    expect(relativeTime(300)).toBe("há 5 h");
    expect(relativeTime(1440)).toBe("ontem");
    expect(relativeTime(4320)).toBe("há 3 dias");
  });
  test("distance", () => {
    expect(distance(173)).toBe("170 m");
    expect(distance(7340)).toBe("7,3 km");
    expect(distance(Number.POSITIVE_INFINITY)).toBe("");
  });
  test("dates count back from now", () => expect(dateAgo(new Date("2026-10-12T14:20:00-03:00"), 43)).toBe("30 ago"));
});
