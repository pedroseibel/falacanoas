import { describe, expect, test } from "bun:test";
import { canoas } from "@fala/instance-canoas";
import { fixtures } from "@fala/instance-canoas/fixtures";
import { itemFromRows, rowsForNewItem, type ItemRow } from "../items-model";
import { parseStamp, seedRows } from "./seed-model";

const tz = canoas.timezone;
const now = new Date(fixtures.now);

/** What the database fills in for an insert. */
function stored(row: ReturnType<typeof seedRows>["row"]): ItemRow {
  return {
    text: "",
    neighborhood: null,
    lng: null,
    lat: null,
    authorNick: null,
    community: "reported",
    officialStatus: null,
    officialAgency: null,
    officialAt: null,
    confirmations: 0,
    followers: 0,
    updates: 0,
    disagreeing: null,
    guest: false,
    demo: false,
    createdAt: now,
    updatedAt: now,
    sentAt: null,
    protocolNumber: null,
    protocolAt: null,
    closedAt: null,
    ...row,
    resolvedVotes: row.resolvedVotes ?? 0,
    resolvingSince: row.resolvingSince ?? null,
    round: row.round ?? 0,
  };
}

describe("parseStamp", () => {
  test("reads the fixtures' stamps against their clock", () => {
    expect(parseStamp("hoje · 13:42", now, tz)?.toISOString()).toBe("2026-10-12T16:42:00.000Z");
    expect(parseStamp("ontem · 19:30", now, tz)?.toISOString()).toBe("2026-10-11T22:30:00.000Z");
    expect(parseStamp("30 ago · 17:42", now, tz)?.toISOString()).toBe("2026-08-30T20:42:00.000Z");
    expect(parseStamp("30 ago", now, tz)?.toISOString()).toBe("2026-08-30T15:00:00.000Z");
    // Later in the year than now: last year.
    expect(parseStamp("3 dez · 10:00", now, tz)?.getUTCFullYear()).toBe(2025);
    expect(parseStamp("semana passada", now, tz)).toBeNull();
  });
});

describe("seedRows", () => {
  const seeded = fixtures.items.map((it) => ({ it, rows: seedRows(it, now, canoas) }));

  test("every fixture reads back the same at the fixtures' now", () => {
    for (const { it, rows } of seeded) {
      const back = itemFromRows(
        stored(rows.row),
        {
          events: rows.events.map((e) => ({ ...e, at: e.at ?? now })),
          photos: rows.photos.map((p) => ({ ...p, credit: p.credit ?? null, takenAt: p.takenAt ?? now })),
        },
        now,
        tz,
      );
      expect({ id: back.id, days: back.days, updated: back.updatedMinutesAgo, official: back.official }).toEqual({
        id: it.id,
        days: it.days,
        updated: it.updatedMinutesAgo,
        official: it.official,
      });
      expect(back.confirmations).toBe(it.confirmations);
      expect(back.community).toBe(it.community);
      expect(back.demo).toBe(true);
    }
  });

  test("histories run forward in time and end by now", () => {
    for (const { rows } of seeded) {
      const created = rows.events.find((e) => e.kind === "created")?.at;
      expect(created).toBeInstanceOf(Date);
      for (const e of rows.events) {
        expect(e.at?.getTime()).toBeLessThanOrEqual(now.getTime());
        expect(e.at?.getTime()).toBeGreaterThanOrEqual(created?.getTime() ?? 0);
      }
      const sent = rows.events.find((e) => e.kind === "sent_to_authority");
      expect(Boolean(sent)).toBe(Boolean(rows.row.sentAt));
    }
  });

  test("keeps the hand-written history of the parada", () => {
    const parada = seeded.find((s) => s.it.id === "7K3QF")?.rows;
    expect(parada?.events.map((e) => e.at?.toISOString())).toEqual([
      "2026-08-30T20:42:00.000Z",
      "2026-08-30T21:00:00.000Z",
      "2026-09-02T10:15:00.000Z",
      "2026-09-11T13:02:00.000Z",
      "2026-09-28T22:30:00.000Z",
      "2026-10-12T16:42:00.000Z",
    ]);
    expect(parada?.row.protocolNumber).toBe("2026/018734");
    expect(parada?.photos[1]?.credit).toBe("Foto: Nilce Bravo, CC BY-SA 3.0");
  });
});

describe("rowsForNewItem", () => {
  test("a new report reads back as itself", () => {
    const at = new Date("2026-10-12T15:00:00-03:00");
    const base = fixtures.items[0];
    if (!base) throw new Error("sem fixtures");
    const item = {
      ...base,
      id: "ABCDE",
      days: 0,
      updatedMinutesAgo: 0,
      confirmations: 0,
      community: "reported" as const,
      official: null,
      sentAt: null,
      protocol: null,
      photos: [{ src: "/api/fotos/x.webp", takenAt: "", by: "biguá" }],
      events: [{ at: "", actor: "biguá", kind: "created" as const, text: "Registrou com foto." }],
    };
    const rows = rowsForNewItem(item, at);
    expect(rows.photos[0]?.storageKey).toBe("x.webp");
    const back = itemFromRows(
      stored(rows.row),
      {
        events: rows.events.map((e) => ({ ...e, at })),
        photos: [{ src: "/api/fotos/x.webp", takenAt: at, by: "biguá", credit: null }],
      },
      at,
      tz,
    );
    expect(back.days).toBe(0);
    expect(back.sentAt).toBeNull();
    expect(back.events?.[0]?.at).toBe("hoje · 15:00");
    expect(back.photos[0]?.takenAt).toBe("hoje · 15:00");
  });
});
