import { describe, expect, test } from "bun:test";
import { covers, toSegment, type FollowPlace } from "./follows";
import type { Item } from "./types";

const at = (lng: number, lat: number, neighborhood = "niteroi"): Item => ({
  id: "ABCDE",
  kind: "occurrence",
  category: "buraco",
  title: "",
  text: "",
  neighborhood,
  scope: { type: "point", lng, lat },
  days: 1,
  updatedMinutesAgo: 1,
  confirmations: 0,
  followers: 0,
  updates: 0,
  photos: [],
  visibility: "pseudonymous",
  author: null,
  community: "reported",
  official: null,
});

const home: FollowPlace = { kind: "home", at: [-51.15, -29.95], radius: 500 };

describe("what a follow covers", () => {
  test("home: within the radius", () => {
    expect(covers(home, at(-51.152, -29.951))).toBeTrue(); // ~220 m
    expect(covers(home, at(-51.16, -29.95))).toBeFalse(); // ~960 m
  });

  test("bairro: by the item's bairro, whatever its shape", () => {
    expect(covers({ kind: "neighborhood", neighborhood: "niteroi" }, at(0, 0))).toBeTrue();
    expect(covers({ kind: "neighborhood", neighborhood: "centro" }, at(-51.15, -29.95))).toBeFalse();
    const city = { ...at(0, 0), scope: { type: "municipality" as const }, neighborhood: null };
    expect(covers(home, city)).toBeFalse();
  });

  test("route: a 400 m corridor along the line between its ends", () => {
    const route: FollowPlace = { kind: "route", from: [-51.15, -29.95], to: [-51.17, -29.92] };
    expect(covers(route, at(-51.16, -29.935))).toBeTrue(); // on the line
    expect(covers(route, at(-51.13, -29.935))).toBeFalse(); // ~2 km east
    expect(covers(route, at(-51.18, -29.91))).toBeFalse(); // past the end
  });

  test("distance to a segment", () => {
    expect(Math.round(toSegment([-51.15, -29.95], [-51.15, -29.95], [-51.16, -29.95]))).toBe(0);
    expect(toSegment([-51.155, -29.954], [-51.15, -29.95], [-51.16, -29.95])).toBeGreaterThan(400);
  });
});
