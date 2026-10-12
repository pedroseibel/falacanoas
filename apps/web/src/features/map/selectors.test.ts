import { describe, expect, test } from "bun:test";
import { canoas } from "@fala/instance-canoas";
import { fixtures } from "@fala/instance-canoas/fixtures";
import { MapSearchSchema, byDistance, visibleItems } from "./selectors";

const me = fixtures.viewer.location;
const all = fixtures.items;

describe("visibleItems", () => {
  test("no filter keeps everything", () => expect(visibleItems(all, {}, canoas, me)).toHaveLength(all.length));
  test("group filter keeps only that group", () => {
    const water = visibleItems(all, { f: "agua" }, canoas, me);
    expect(water.length).toBeGreaterThan(0);
    expect(water.every((i) => ["alaga", "bocalobo", "esgoto"].includes(i.category))).toBeTrue();
  });
  test("'agora' keeps items updated in the last 3 hours", () =>
    expect(visibleItems(all, { f: "agora" }, canoas, me).every((i) => i.updatedMinutesAgo <= 180)).toBeTrue());
  test("search ignores accents and matches bairro names", () => {
    const r = visibleItems(all, { q: "niteroi" }, canoas, me);
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((i) => i.neighborhood === "niteroi" || i.title.toLowerCase().includes("niter"))).toBeTrue();
  });
  test("search finds an item by its public code", () =>
    expect(visibleItems(all, { q: "7k3qf" }, canoas, me).map((i) => i.id)).toEqual(["7K3QF"]));
  test("'antigos' puts open items first, oldest first", () => {
    const r = visibleItems(all, { sort: "antigos" }, canoas, me);
    const firstResolved = r.findIndex((i) => i.community === "resolved");
    expect(r.slice(0, firstResolved).every((i, k, arr) => k === 0 || (arr[k - 1]?.days ?? 0) >= i.days)).toBeTrue();
  });
  test("'perto' sorts by distance and leaves city-wide items last", () => {
    const r = visibleItems(all, { sort: "perto" }, canoas, me);
    expect(r.at(-1)?.scope.type).toBe("municipality");
  });
  test("distance comparator is total, even with infinities", () => {
    const inf = Number.POSITIVE_INFINITY;
    expect([inf, 3, inf, 1].toSorted(byDistance)).toEqual([1, 3, inf, inf]);
    expect(byDistance(inf, inf)).toBe(0);
  });
  test("search params are validated", () => {
    expect(MapSearchSchema.safeParse({ sort: "aleatorio" }).success).toBeFalse();
    expect(MapSearchSchema.parse({ f: "agua", sort: "antigos" })).toEqual({ f: "agua", sort: "antigos" });
  });
});
