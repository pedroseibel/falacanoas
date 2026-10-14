import { describe, expect, test } from "bun:test";
import { isOpen } from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { fixtures } from "@fala/instance-canoas/fixtures";
import { queryWords, visibleItems } from "@/features/map/selectors";
import { bairroLeads, matchCommands, rankBairros, rankPins, seeOnMapLabel, shortcutKeys } from "./palette-model";

const all = fixtures.items;
const me = fixtures.viewer.location;
const leads = (q: string) => bairroLeads(rankBairros(canoas, all, queryWords(q), 4), queryWords(q));

describe("rankPins", () => {
  test("a code finds its pin, typed any way", () => {
    for (const q of ["7K3QF", "7k3qf", "#7K3QF"]) {
      const r = rankPins(all, queryWords(q), canoas, 6);
      expect(r.shown[0]?.id).toBe("7K3QF");
    }
  });

  test("counts what the map's list would show for the same words", () => {
    for (const q of ["buraco niteroi", "escola", "calcada centro", "semaforo"]) {
      expect(rankPins(all, queryWords(q), canoas, 6).total).toBe(visibleItems(all, { q }, canoas, me).length);
    }
  });

  test("every word must land: type and bairro together", () => {
    const r = rankPins(all, queryWords("buraco niterói"), canoas, 50);
    expect(r.total).toBeGreaterThan(0);
    expect(r.shown.every((it) => it.neighborhood === "niteroi")).toBeTrue();
  });

  test("a title that starts with the word comes before one that only contains it", () => {
    const r = rankPins(all, queryWords("buraco"), canoas, 6);
    expect(r.shown[0]?.title.startsWith("Buraco")).toBeTrue();
  });

  test("among equals, open before resolved, then the most recently active", () => {
    const { shown } = rankPins(all, queryWords("buraco na frente da escola"), canoas, 100);
    expect(shown.length).toBeGreaterThan(3);
    for (let k = 1; k < shown.length; k++) {
      const a = shown[k - 1];
      const b = shown[k];
      if (!a || !b) continue;
      expect(Number(isOpen(a))).toBeGreaterThanOrEqual(Number(isOpen(b)));
      if (isOpen(a) === isOpen(b)) expect(a.updatedMinutesAgo).toBeLessThanOrEqual(b.updatedMinutesAgo);
    }
  });

  test("shows up to the limit and counts the rest", () => {
    const r = rankPins(all, queryWords("buraco"), canoas, 6);
    expect(r.shown).toHaveLength(6);
    expect(r.total).toBeGreaterThan(6);
  });

  test("nothing typed, nothing listed", () => expect(rankPins(all, [], canoas, 6)).toEqual({ shown: [], total: 0 }));
});

describe("rankBairros", () => {
  test("accents aside, names that start with the word first", () => {
    expect(rankBairros(canoas, all, queryWords("sao"), 4).map((b) => b.name)).toEqual(["São José", "São Luís"]);
    expect(rankBairros(canoas, all, queryWords("ma"), 4)[0]?.name).toBe("Marechal Rondon");
    expect(rankBairros(canoas, all, queryWords("velh"), 4).map((b) => b.slug)).toEqual([
      "estancia-velha",
      "mathias-velho",
    ]);
  });

  test("a bairro typed from the start of its name leads the results", () => {
    expect(leads("mathias v")).toBeTrue();
    expect(leads("velho")).toBeFalse();
    expect(bairroLeads([], [])).toBeFalse();
  });

  test("with the open problems each one has", () => {
    const [b] = rankBairros(canoas, all, queryWords("niteroi"), 4);
    expect(b?.open).toBe(all.filter((it) => it.neighborhood === "niteroi" && isOpen(it)).length);
  });
});

describe("matchCommands", () => {
  const commands = [
    { label: "Registrar um problema", keywords: ["novo", "buraco"] },
    { label: "Placar", keywords: ["órgãos", "secretarias"] },
    { label: "Tema escuro", keywords: ["aparência", "noite"], typedOnly: true },
  ];

  test("empty: everything but what waits to be typed", () =>
    expect(matchCommands(commands, []).map((c) => c.label)).toEqual(["Registrar um problema", "Placar"]));

  test("by label or keyword, accents aside; a label hit first", () => {
    expect(matchCommands(commands, queryWords("orgaos")).map((c) => c.label)).toEqual(["Placar"]);
    expect(matchCommands(commands, queryWords("escuro")).map((c) => c.label)).toEqual(["Tema escuro"]);
    expect(matchCommands(commands, queryWords("tema noite")).map((c) => c.label)).toEqual(["Tema escuro"]);
    expect(matchCommands(commands, queryWords("p")).map((c) => c.label)).toEqual([
      "Placar",
      "Registrar um problema",
      "Tema escuro",
    ]);
  });
});

test("the shortcut as each keyboard prints it", () => {
  expect(shortcutKeys("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)")).toEqual(["⌘", "K"]);
  expect(shortcutKeys("Mozilla/5.0 (X11; Linux x86_64)")).toEqual(["Ctrl", "K"]);
});

test("the way to the map says how many it will show", () => {
  expect(seeOnMapLabel(1, "escola")).toBe("Ver no mapa o registro com “escola”");
  expect(seeOnMapLabel(12, "escola")).toBe("Ver no mapa os 12 registros com “escola”");
});
