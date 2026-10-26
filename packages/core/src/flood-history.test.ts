import { describe, expect, test } from "bun:test";
import { floodHistory, floodHistoryLine } from "./flood-history";

const tz = "America/Sao_Paulo";
const here: [number, number] = [-51.18, -29.91];
// About 100 m and 400 m east.
const near: [number, number] = [-51.17896, -29.91];
const far: [number, number] = [-51.17585, -29.91];
const s = (at: [number, number], when: string) => ({ at, when: new Date(when) });

describe("a flooding record's stretch over time", () => {
  test("counts different local days within the stretch, first to last", () => {
    const h = floodHistory(
      here,
      [
        s(here, "2026-06-17T21:00:00Z"),
        s(near, "2026-06-17T23:30:00Z"), // the same day
        s(near, "2026-06-18T02:00:00Z"), // 17 June, 23h local: still the same day
        s(here, "2026-07-28T15:00:00Z"),
        s(far, "2026-08-01T15:00:00Z"), // too far
        s(near, "2026-10-26T12:00:00Z"),
      ],
      tz,
    );
    expect(h).toEqual({ days: 3, first: "2026-06-17T21:00:00.000Z", last: "2026-10-26T12:00:00.000Z", meters: 150 });
  });

  test("one day is just the record itself: nothing to say", () => {
    expect(floodHistory(here, [s(here, "2026-06-17T21:00:00Z"), s(near, "2026-06-17T22:00:00Z")], tz)).toBeNull();
    expect(floodHistory(here, [], tz)).toBeNull();
  });

  test("reads as what was registered, and says what silence means", () => {
    const { line, note } = floodHistoryLine(
      { days: 4, first: "2026-06-17T21:00:00Z", last: "2026-10-26T12:00:00Z", meters: 150 },
      tz,
    );
    expect(line).toBe(
      "Neste trecho, até 150 m: alagamento registrado em 4 dias diferentes, de 17 jun 2026 a 26 out 2026.",
    );
    expect(note).toContain("Sem relatos não é sem alagamento.");
  });
});
