import { describe, expect, test } from "bun:test";
import { canoas } from "@fala/instance-canoas";
import { fixtures } from "@fala/instance-canoas/fixtures";
import { overDeadlineByBairro, placarKpis, placarRows, weeklyNew } from "./placar-model";

const items = fixtures.items;

describe("placar", () => {
  test("rows by type use category labels", () => {
    const rows = placarRows(items, canoas, "tipo");
    expect(rows.find((r) => r.key === "buraco")?.name).toBe("Buraco na rua");
    expect(rows.some((r) => r.key === "questao")).toBeFalse();
  });
  test("rows by bairro link to the bairro", () =>
    expect(placarRows(items, canoas, "bairro").every((r) => r.bairro === r.key)).toBeTrue());
  test("kpis are consistent with the choropleth", () => {
    const k = placarKpis(items, 30);
    const total = Object.values(overDeadlineByBairro(items, 30)).reduce((a, b) => a + b, 0);
    expect(total).toBe(k.overDeadline);
    expect(k.open + k.fixed).toBe(items.filter((i) => i.kind === "occurrence").length);
  });
  test("weekly series has 12 points ending in the current week", () => {
    const w = weeklyNew(items);
    expect(w).toHaveLength(12);
    expect(w.at(-1)?.week).toBe("esta");
  });
});
