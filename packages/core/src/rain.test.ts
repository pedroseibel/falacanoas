import { describe, expect, test } from "bun:test";
import {
  dayRain,
  gaugePage,
  localDayBounds,
  parseCemadenTime,
  rainLine,
  readCemadenFeed,
  type RainSource,
} from "./rain";

// Entries as Cemaden's feed sent them on 2026-10-26 (trimmed to the fields read and one stranger).
const feed = [
  {
    idestacao: 7325,
    cidade: "CANOAS",
    nomeestacao: "G2-Mathias Velho",
    ultimovalor: 0,
    datahoraUltimovalor: "26/10/26 18:10",
    acc1hr: 0.2,
    acc3hr: 0.4,
    acc6hr: 0.8,
    acc12hr: 1.6,
    acc24hr: 3,
    acc48hr: 10.8,
    acc72hr: 14.4,
    acc96hr: 14.6,
  },
  {
    idestacao: 7324,
    cidade: "CANOAS",
    nomeestacao: "G2-Rio Branco",
    ultimovalor: 0,
    datahoraUltimovalor: "26/10/26 18:10",
    acc1hr: "-",
    acc3hr: "-",
    acc6hr: "-",
    acc12hr: "-",
    acc24hr: 0.8,
    acc48hr: 10.6,
    acc72hr: 39.2,
    acc96hr: 39.2,
  },
  {
    idestacao: 7329,
    cidade: "CAXIAS DO SUL",
    ultimovalor: 0,
    datahoraUltimovalor: "26/10/26 18:10",
    acc1hr: "-",
    acc3hr: "-",
    acc6hr: "-",
    acc12hr: 2.8,
    acc24hr: 14,
    acc48hr: 18,
    acc72hr: 30.4,
    acc96hr: 30.6,
  },
];
const fetchedAt = new Date("2026-10-26T18:38:00Z");

describe("parseCemadenTime", () => {
  test("reads the feed's day/month/two-digit year as UTC", () => {
    expect(parseCemadenTime("26/10/26 18:10")?.toISOString()).toBe("2026-10-26T18:10:00.000Z");
  });
  test("refuses what isn't a moment", () => {
    for (const s of ["31/02/26 10:00", "26/10/26 24:10", "2026-10-26 18:10", "", "26/10/26"])
      expect(parseCemadenTime(s)).toBeNull();
  });
});

describe("readCemadenFeed", () => {
  test("keeps only the gauges asked for, with every window, and reads '-' as no rain", () => {
    const { readings, skipped } = readCemadenFeed(feed, [7324, 7325], fetchedAt);
    expect(skipped).toBe(0);
    expect(readings.map((r) => r.gauge)).toEqual([7325, 7324]);
    expect(readings[0]).toEqual({
      gauge: 7325,
      observedAt: new Date("2026-10-26T18:10:00Z"),
      last: 0,
      acc: { 1: 0.2, 3: 0.4, 6: 0.8, 12: 1.6, 24: 3, 48: 10.8, 72: 14.4, 96: 14.6 },
    });
    expect(readings[1]?.acc).toEqual({ 1: 0, 3: 0, 6: 0, 12: 0, 24: 0.8, 48: 10.6, 72: 39.2, 96: 39.2 });
  });

  test("rounds to the tenth the gauges measure", () => {
    const [r] = readCemadenFeed([{ ...feed[0], acc24hr: 0.30000000000000004 }], [7325], fetchedAt).readings;
    expect(r?.acc[24]).toBe(0.3);
  });

  test("a missing last value is kept as unknown, not as zero", () => {
    const [r] = readCemadenFeed([{ ...feed[0], ultimovalor: null }], [7325], fetchedAt).readings;
    expect(r?.last).toBeNull();
  });

  test("skips and counts entries that don't parse, or are stamped in the future", () => {
    const bad = [
      { ...feed[0], acc24hr: "x" },
      { ...feed[0], acc24hr: -1 },
      { ...feed[0], datahoraUltimovalor: "ontem" },
      { ...feed[0], datahoraUltimovalor: "26/10/26 19:10" },
      { idestacao: 7325 },
    ];
    expect(readCemadenFeed(bad, [7325], fetchedAt)).toEqual({ readings: [], skipped: 5 });
  });

  test("anything but a list reads as nothing", () => {
    expect(readCemadenFeed({ erro: 1 }, [7325], fetchedAt)).toEqual({ readings: [], skipped: 0 });
    expect(readCemadenFeed(null, [7325], fetchedAt)).toEqual({ readings: [], skipped: 0 });
  });
});

test("gaugePage names the station's own chart", () => {
  const source: RainSource = {
    agency: "Cemaden",
    feed: "f",
    page: "https://x/grafico.php?idpcd={id}&uf=RS",
    gauges: [],
  };
  expect(gaugePage(source, 7326)).toBe("https://x/grafico.php?idpcd=7326&uf=RS");
});

const r = (gauge: number, at: string, acc24: number) => ({ gauge, observedAt: new Date(at), acc24 });

describe("the day's rain beside a flooding record", () => {
  const source: RainSource = {
    agency: "Cemaden",
    feed: "f",
    page: "https://cemaden.invalid/{id}",
    gauges: [
      { id: 7325, name: "Mathias Velho", place: "", at: [-51.19705, -29.89738] },
      { id: 7324, name: "Rio Branco", place: "", at: [-51.19082, -29.9663] },
    ],
  };
  // About 1 km from Mathias Velho, 7 km from Rio Branco.
  const near: [number, number] = [-51.1873, -29.8943];

  test("the nearest gauge's largest 24 h total that day", () => {
    const day = dayRain(source, near, [
      r(7325, "2026-06-17T18:00:00Z", 12.4),
      r(7325, "2026-06-17T23:00:00Z", 69),
      r(7325, "2026-06-18T02:00:00Z", 55.2),
      r(7324, "2026-06-17T23:00:00Z", 90),
    ]);
    expect(day).toMatchObject({ gauge: 7325, name: "Mathias Velho", mm: 69, until: "2026-06-17T23:00:00.000Z" });
    expect(day?.page).toBe("https://cemaden.invalid/7325");
    expect(day?.meters).toBeGreaterThan(900);
    expect(day?.meters).toBeLessThan(1100);
  });

  test("a silent gauge is passed over for the next nearest; none near, or none measured, is nothing", () => {
    expect(dayRain(source, near, [r(7324, "2026-06-17T23:00:00Z", 30)])?.gauge).toBe(7324);
    expect(dayRain(source, near, [])).toBeNull();
    expect(dayRain(source, [-51.5, -29.9], [r(7325, "2026-06-17T23:00:00Z", 30)])).toBeNull();
  });

  test("a dry day is still a reading", () => {
    expect(dayRain(source, near, [r(7325, "2026-06-17T23:00:00Z", 0)])?.mm).toBe(0);
  });

  test("the local day, as instants", () => {
    const { from, to } = localDayBounds(new Date("2026-06-18T01:30:00Z"), "America/Sao_Paulo");
    expect(from.toISOString()).toBe("2026-06-17T03:00:00.000Z");
    expect(to.toISOString()).toBe("2026-06-18T03:00:00.000Z");
  });

  test("reads as observed, with its source and time", () => {
    const base = {
      gauge: 7325,
      name: "Mathias Velho",
      agency: "Cemaden",
      page: "p",
      meters: 1234,
      until: "2026-06-17T23:10:00Z",
    };
    expect(rainLine({ ...base, mm: 69.2 }, "America/Sao_Paulo")).toEqual({
      line: "Nesse dia, 69,2 mm em 24 h no pluviômetro Mathias Velho, a 1,2 km.",
      source: "Cemaden, pluviômetro automático: o maior acumulado de 24 h medido nesse dia, às 20:10.",
    });
    expect(rainLine({ ...base, mm: 3, meters: 640 }, "America/Sao_Paulo").line).toBe(
      "Nesse dia, 3 mm em 24 h no pluviômetro Mathias Velho, a 640 m.",
    );
    expect(rainLine({ ...base, mm: 0 }, "America/Sao_Paulo").line).toBe(
      "Nesse dia, nenhuma chuva em 24 h no pluviômetro Mathias Velho, a 1,2 km.",
    );
  });
});
