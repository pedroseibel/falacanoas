import { describe, expect, test } from "bun:test";
import { gaugesNow, hourlyBars, mmLabel } from "./rain-now";
import type { RainSource } from "./rain";

const source: RainSource = {
  agency: "Cemaden",
  feed: "f",
  page: "p/{id}",
  gauges: [
    { id: 7325, name: "Mathias Velho", place: "Curitiba, 1551", at: [-51.19705, -29.89738] },
    { id: 7328, name: "Marechal Rondon", place: "Corpo de Bombeiros", at: [-51.16989, -29.92496] },
  ],
};
const r = (gauge: number, at: string, acc1: number, acc24: number) => ({
  gauge,
  observedAt: new Date(at),
  acc1,
  acc24,
});

describe("Chuva agora", () => {
  test("each gauge's latest hour and day, and its hours back from that reading", () => {
    const readings = [
      r(7325, "2026-10-26T16:10:00Z", 0.4, 2.2),
      r(7325, "2026-10-26T17:10:00Z", 0.6, 2.8),
      r(7325, "2026-10-26T17:40:00Z", 1.0, 3.0), // between hour marks: not a bar of its own
      r(7325, "2026-10-26T18:10:00Z", 0.2, 3.0),
    ];
    const [mv, mr] = gaugesNow(source, readings, new Date("2026-10-26T18:42:00Z"));
    expect(mv).toMatchObject({ id: 7325, observedAt: "2026-10-26T18:10:00.000Z", lastHour: 0.2, day: 3, stale: false });
    expect(mv?.hours).toHaveLength(24);
    expect(mv?.hours.slice(-3).map((h) => h.mm)).toEqual([0.4, 0.6, 0.2]);
    expect(mv?.hours[0]?.mm).toBeNull();
    expect(mr).toMatchObject({ id: 7328, observedAt: null, lastHour: null, stale: true, hours: [] });
  });

  test("a reading older than three hours is stale, not 'agora'", () => {
    const [mv] = gaugesNow(source, [r(7325, "2026-10-26T12:10:00Z", 0, 0)], new Date("2026-10-26T18:42:00Z"));
    expect(mv?.stale).toBeTrue();
  });

  test("hours match readings within five minutes of each mark", () => {
    const bars = hourlyBars([r(7325, "2026-10-26T17:13:00Z", 5, 5)], new Date("2026-10-26T18:10:00Z"), 2);
    expect(bars).toEqual([
      { until: "2026-10-26T17:10:00.000Z", mm: 5 },
      { until: "2026-10-26T18:10:00.000Z", mm: null },
    ]);
  });

  test("mm read as people say them", () => {
    expect(mmLabel(2.4)).toBe("2,4 mm");
    expect(mmLabel(0)).toBe("0 mm");
    expect(mmLabel(12)).toBe("12 mm");
  });
});
