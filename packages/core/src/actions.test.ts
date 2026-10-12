import { describe, expect, test } from "bun:test";
import { applyAction, quietClose, type ActionContext, type ItemAction } from "./actions";
import type { Item } from "./types";

const tz = "America/Sao_Paulo";
const now = new Date("2026-10-12T15:00:00-03:00");

const base: Item = {
  id: "ABCDE",
  kind: "occurrence",
  category: "buraco",
  title: "Buraco",
  text: "",
  neighborhood: "niteroi",
  scope: { type: "point", lng: -51.15, lat: -29.95 },
  days: 10,
  updatedMinutesAgo: 600,
  confirmations: 0,
  followers: 1,
  updates: 0,
  photos: [],
  visibility: "pseudonymous",
  author: "garça",
  community: "reported",
  official: null,
  sentAt: "2026-10-02T18:00:00-03:00",
  events: [{ at: "2 out · 09:00", actor: "garça", kind: "created", text: "Registrou." }],
};

const neighbour: ActionContext = { by: "biguá", author: false, independent: true, already: false, now, timezone: tz };
const run = (it: Item, a: ItemAction, ctx: Partial<ActionContext> = {}) => applyAction(it, a, { ...neighbour, ...ctx });
const item = (r: ReturnType<typeof applyAction>) => {
  if (!r.ok) throw new Error(r.reason);
  return r.item;
};

describe("confirming", () => {
  test("an independent neighbour confirms once; the item becomes confirmed", () => {
    const r = run(base, { type: "confirm" });
    expect(r.ok && r.event).toMatchObject({ kind: "confirmed", actor: "biguá", at: "12 out · 15:00" });
    expect(item(r)).toMatchObject({ confirmations: 1, community: "confirmed", updatedMinutesAgo: 0 });
    expect(run(base, { type: "confirm" }, { already: true })).toEqual({ ok: false, reason: "already" });
  });

  test("never the author, never a phone verified less than 72 h ago", () => {
    expect(run(base, { type: "confirm" }, { author: true })).toEqual({ ok: false, reason: "own" });
    expect(run(base, { type: "confirm" }, { independent: false })).toEqual({ ok: false, reason: "too-new" });
  });

  test("a questão pública collects “isso também me afeta” without a status change", () => {
    const issue = { ...base, kind: "public_issue" as const, community: "reported" as const };
    const r = run(issue, { type: "confirm" });
    expect(item(r)).toMatchObject({ confirmations: 1, community: "reported" });
    expect(r.ok && r.event.text).toBe("“Isso também me afeta.”");
    expect(run(issue, { type: "resolved", photos: [] })).toEqual({ ok: false, reason: "kind" });
  });
});

describe("closing", () => {
  test("two neighbours close it; the first leaves it closing", () => {
    const first = item(run(base, { type: "resolved", photos: [] }));
    expect(first).toMatchObject({ community: "apparently_resolved", resolvedVotes: 1, closedAt: null });
    expect(first.resolvingSince).toBe(now.toISOString());
    const later = new Date(now.getTime() + 3_600_000);
    const second = item(
      run(first, { type: "resolved", photos: ["/api/fotos/depois.webp"] }, { by: "sabiá", now: later }),
    );
    expect(second).toMatchObject({ community: "resolved", resolvedVotes: 2, closedAt: later.toISOString() });
    expect(second.resolvingSince).toBe(now.toISOString());
    expect(second.photos.at(-1)).toMatchObject({ src: "/api/fotos/depois.webp", by: "sabiá" });
    expect(second.events?.at(-1)?.text).toBe("Confirmou o conserto, com foto do depois. O registro fechou.");
  });

  test("the reporter's word alone closes it", () => {
    expect(item(run(base, { type: "resolved", photos: [] }, { author: true }))).toMatchObject({
      community: "resolved",
    });
  });

  test("“ainda não” reopens it and starts a new round", () => {
    const closing = item(run(base, { type: "resolved", photos: [] }));
    const r = run(closing, { type: "still" }, { by: "sabiá" });
    expect(r.ok && r.reopened).toBeTrue();
    expect(r.ok && r.event.kind).toBe("reopened");
    expect(item(r)).toMatchObject({ community: "ongoing", resolvedVotes: 0, resolvingSince: null, closedAt: null });
  });

  test("“continua” against the Prefeitura's “resolvido” counts as disagreement", () => {
    const official = {
      ...base,
      community: "ongoing" as const,
      official: { status: "resolved" as const, agency: "Obras", daysAgo: 2 },
    };
    expect(item(run(official, { type: "still" }))).toMatchObject({ disagreeing: 1, community: "ongoing" });
  });

  test("15 quiet days close it, dated at the end of the quiet period", () => {
    const closing = item(run(base, { type: "resolved", photos: [] }));
    expect(quietClose(closing, new Date(now.getTime() + 14 * 864e5), tz, "Fala, Canoas")).toBeNull();
    const closed = quietClose(closing, new Date(now.getTime() + 20 * 864e5), tz, "Fala, Canoas");
    expect(closed?.item).toMatchObject({
      community: "resolved",
      closedAt: new Date(now.getTime() + 15 * 864e5).toISOString(),
    });
    expect(closed?.event).toMatchObject({
      actor: "Fala, Canoas",
      at: "27 out · 15:00",
      text: "Fechado: 15 dias sem contestação.",
    });
    expect(quietClose(base, now, tz, "Fala, Canoas")).toBeNull();
  });

  test("a closed pin takes no more confirmations or resolution votes", () => {
    const closed = { ...base, community: "resolved" as const };
    expect(run(closed, { type: "confirm" })).toEqual({ ok: false, reason: "closed" });
    expect(run(closed, { type: "resolved", photos: [] })).toEqual({ ok: false, reason: "closed" });
  });
});

describe("updates and photos", () => {
  test("anyone signed in adds to the timeline; empty text is refused", () => {
    expect(
      item(run(base, { type: "update", text: "  Choveu e piorou.  " }, { independent: false })).events?.at(-1),
    ).toMatchObject({
      kind: "update_added",
      text: "Choveu e piorou.",
    });
    expect(run(base, { type: "update", text: "   " })).toEqual({ ok: false, reason: "empty" });
    const r = run(base, { type: "photo", photos: ["/api/fotos/a.webp", "/api/fotos/b.webp"] }, { independent: false });
    expect(item(r)).toMatchObject({ updates: 1, photos: [{ src: "/api/fotos/a.webp" }, { src: "/api/fotos/b.webp" }] });
    expect(r.ok && r.event.text).toBe("Adicionou 2 fotos atuais.");
  });
});
