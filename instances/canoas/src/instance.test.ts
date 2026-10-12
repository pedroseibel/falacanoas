import { describe, expect, test } from "bun:test";
import { itemLngLat, neighborhoodAt } from "@fala/core";
import { canoas } from "./index";
import { fixtures } from "./fixtures";

describe("Canoas instance", () => {
  test("has the 18 official bairros, in config and in geometry", () => {
    expect(canoas.neighborhoods).toHaveLength(18);
    expect(canoas.geo.neighborhoods.features).toHaveLength(18);
    const slugs = new Set(canoas.neighborhoods.map((n) => n.slug));
    for (const f of canoas.geo.neighborhoods.features) expect(slugs.has(f.properties.slug)).toBeTrue();
  });
  test("low-population bairros open with the first full queue (null threshold)", () => {
    const open = canoas.neighborhoods
      .filter((n) => n.threshold === null)
      .map((n) => n.slug)
      .toSorted();
    expect(open).toEqual(["brigadeira", "ilha-das-garcas", "industrial"]);
  });
  test("every category belongs to a filter group", () => {
    const groups = new Set(canoas.filterGroups.map((g) => g.key));
    for (const c of canoas.categories) expect(groups.has(c.group)).toBeTrue();
  });
});

describe("demo fixtures", () => {
  test("parse against the core schema", () => expect(fixtures.items.length).toBeGreaterThan(400));
  test("ids are unique", () => expect(new Set(fixtures.items.map((i) => i.id)).size).toBe(fixtures.items.length));
  test("every pin lies inside the bairro it claims", () => {
    for (const it of fixtures.items) {
      const pt = itemLngLat(it);
      if (!pt || it.scope.type !== "point") continue;
      expect({ id: it.id, bairro: neighborhoodAt(pt, canoas.geo.neighborhoods) }).toEqual({
        id: it.id,
        bairro: it.neighborhood,
      });
    }
  });
  test("every category in use is configured", () => {
    const known = new Set(canoas.categories.map((c) => c.key));
    for (const it of fixtures.items) expect(known.has(it.category)).toBeTrue();
  });
});
