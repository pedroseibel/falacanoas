import { describe, expect, test } from "bun:test";
import type { RainReading, RainSource } from "@fala/core";
import { archiveRain, type RainStore } from "./rain";

const source: RainSource = {
  agency: "Cemaden",
  feed: "https://cemaden.invalid/feed?uf=RS",
  page: "https://cemaden.invalid/{id}",
  heavyMmPerHour: 10,
  gauges: [
    { id: 7324, name: "Rio Branco", place: "", at: [-51.19, -29.97] },
    { id: 7325, name: "Mathias Velho", place: "", at: [-51.2, -29.9] },
  ],
};

const station = (idestacao: number, at = "26/10/26 18:10") => ({
  idestacao,
  ultimovalor: 0.2,
  datahoraUltimovalor: at,
  acc1hr: 0.2,
  acc3hr: 0.2,
  acc6hr: 0.2,
  acc12hr: 0.2,
  acc24hr: 1,
  acc48hr: 1,
  acc72hr: 1,
  acc96hr: 1,
});

/** Keeps by (gauge, time), as the table's primary key does. */
function memoryStore() {
  const rows = new Map<string, RainReading & { fetchedAt: Date }>();
  const store: RainStore = {
    keep: async (readings, fetchedAt) => {
      let n = 0;
      for (const r of readings) {
        const key = `${r.gauge}@${r.observedAt.toISOString()}`;
        if (rows.has(key)) continue;
        rows.set(key, { ...r, fetchedAt });
        n++;
      }
      return n;
    },
  };
  return { store, rows };
}

const answering = (body: unknown, status = 200) => {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetch = async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(body), { status });
  };
  return { fetch, calls };
};

const now = new Date("2026-10-26T18:42:00Z");

const down = async (): Promise<Response> => {
  throw new Error("ECONNRESET");
};

describe("archiveRain", () => {
  test("keeps each gauge's reading once, however often the feed is read", async () => {
    const { store, rows } = memoryStore();
    const { fetch, calls } = answering([station(7324), station(7325), station(9999)]);
    expect(await archiveRain(source, { fetch, store }, now)).toEqual({
      ok: true,
      kept: 2,
      read: 2,
      skipped: 0,
      missing: [],
    });
    expect(await archiveRain(source, { fetch, store }, now)).toMatchObject({ ok: true, kept: 0, read: 2 });
    expect(rows.size).toBe(2);
    expect(rows.get("7325@2026-10-26T18:10:00.000Z")?.fetchedAt).toEqual(now);
    expect(calls[0]?.url).toBe(source.feed);
    expect(new Headers(calls[0]?.init.headers).get("user-agent")).toContain("Fala, Canoas");
  });

  test("a new time is a new row; a silent gauge adds nothing and is named", async () => {
    const { store, rows } = memoryStore();
    await archiveRain(source, { fetch: answering([station(7324), station(7325)]).fetch, store }, now);
    const later = answering([station(7324, "26/10/26 18:20")]);
    expect(await archiveRain(source, { fetch: later.fetch, store }, now)).toMatchObject({
      kept: 1,
      missing: [7325],
    });
    expect(rows.size).toBe(3);
  });

  test("a feed that fails or changes shape is reported, and nothing is kept", async () => {
    const { store, rows } = memoryStore();
    expect(await archiveRain(source, { fetch: answering([], 503).fetch, store }, now)).toEqual({
      ok: false,
      error: "fetch",
      detail: "HTTP 503",
    });
    expect(await archiveRain(source, { fetch: answering({ erro: "x" }).fetch, store }, now)).toMatchObject({
      ok: false,
      error: "feed",
    });
    expect(await archiveRain(source, { fetch: down, store }, now)).toMatchObject({ ok: false, error: "fetch" });
    expect(rows.size).toBe(0);
  });
});
