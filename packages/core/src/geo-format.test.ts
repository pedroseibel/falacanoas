import { describe, expect, test } from "bun:test";
import { calendarDays, dateAgo, distance, eventStamp, localTime, relativeTime, zonedDate } from "./format";
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
          [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
            [0, 0],
          ],
          [
            [4, 4],
            [6, 4],
            [6, 6],
            [4, 6],
            [4, 4],
          ],
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
  test("dates count back from now", () =>
    expect(dateAgo(new Date("2026-10-12T14:20:00-03:00"), 43, "America/Sao_Paulo")).toBe("30 ago"));
});

describe("municipal clock", () => {
  const tz = "America/Sao_Paulo";
  const now = new Date("2026-10-12T14:20:00-03:00");

  test("reads and builds wall-clock times in the municipality", () => {
    expect(localTime(now, tz)).toEqual({ year: 2026, month: 10, day: 12, hour: 14, minute: 20 });
    expect(zonedDate({ year: 2026, month: 8, day: 30, hour: 18, minute: 0 }, tz).toISOString()).toBe(
      "2026-08-30T21:00:00.000Z",
    );
  });

  test("counts calendar days, not 24-hour periods", () => {
    expect(calendarDays(new Date("2026-08-30T18:00:00-03:00"), now, tz)).toBe(43);
    expect(calendarDays(new Date("2026-10-11T23:50:00-03:00"), new Date("2026-10-12T00:10:00-03:00"), tz)).toBe(1);
    // 01:00 UTC on the 12th is still the 11th in Canoas.
    expect(calendarDays(new Date("2026-10-12T01:00:00Z"), now, tz)).toBe(1);
  });

  test("stamps say hoje and ontem", () => {
    expect(eventStamp(new Date("2026-10-12T13:42:00-03:00"), now, tz)).toBe("hoje · 13:42");
    expect(eventStamp(new Date("2026-10-11T19:30:00-03:00"), now, tz)).toBe("ontem · 19:30");
    expect(eventStamp(new Date("2026-08-30T17:42:00-03:00"), now, tz)).toBe("30 ago · 17:42");
  });
});
