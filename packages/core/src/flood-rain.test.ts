import { describe, expect, test } from "bun:test";
import { itemRain, rainWindow } from "./flood-rain";
import type { Municipality } from "./types";

const muni: Pick<Municipality, "categories" | "timezone" | "rain"> = {
  timezone: "America/Sao_Paulo",
  categories: [
    { key: "alaga", label: "Rua que alaga", group: "agua", agency: null, kind: "occurrence", asks: "flooding" },
    { key: "buraco", label: "Buraco", group: "ruas", agency: null, kind: "occurrence" },
  ],
  rain: {
    agency: "Cemaden",
    feed: "f",
    page: "p/{id}",
    gauges: [{ id: 7325, name: "Mathias Velho", place: "", at: [-51.19705, -29.89738] }],
  },
};
const item = {
  category: "alaga",
  scope: { type: "point" as const, lng: -51.1873, lat: -29.8943 },
  // 22h30 on 17 June in Canoas.
  createdAt: "2026-06-18T01:30:00Z",
};
const reading = (at: string, acc24: number) => ({ gauge: 7325, observedAt: new Date(at), acc24 });

describe("the day's rain on a record", () => {
  test("only flooding types with a point and a time get one", () => {
    expect(rainWindow(muni, item)).not.toBeNull();
    expect(rainWindow(muni, { ...item, category: "buraco" })).toBeNull();
    expect(rainWindow(muni, { ...item, scope: { type: "neighborhood", neighborhood: "centro" } })).toBeNull();
    expect(rainWindow(muni, { ...item, createdAt: undefined })).toBeNull();
    expect(rainWindow({ ...muni, rain: undefined }, item)).toBeNull();
  });

  test("counts only readings on the record's own local day", () => {
    const readings = [
      reading("2026-06-17T02:50:00Z", 90), // 16 June, 23h50 local: the day before
      reading("2026-06-17T23:00:00Z", 69),
      reading("2026-06-18T03:10:00Z", 75), // 18 June, 00h10 local: the day after
    ];
    expect(itemRain(muni, item, readings)?.mm).toBe(69);
    expect(itemRain(muni, { ...item, category: "buraco" }, readings)).toBeNull();
  });
});
