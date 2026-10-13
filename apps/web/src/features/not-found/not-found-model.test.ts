import { describe, expect, test } from "bun:test";
import { findBairro, looksLikeCode, normalizeSlug, pathHints, shownPath } from "./not-found-model";

const bairros = [
  { slug: "mathias-velho", name: "Mathias Velho" },
  { slug: "sao-jose", name: "São José" },
  { slug: "sao-luis", name: "São Luís" },
  { slug: "guajuviras", name: "Guajuviras" },
  { slug: "nossa-senhora-das-gracas", name: "Nossa Senhora das Graças" },
  { slug: "centro", name: "Centro" },
];

describe("normalizeSlug", () => {
  test("accents, spaces, capitals and encoding all fold to the slug's form", () => {
    expect(normalizeSlug("São José")).toBe("sao-jose");
    expect(normalizeSlug("Mathias%20Velho")).toBe("mathias-velho");
    expect(normalizeSlug("  --Centro!! ")).toBe("centro");
    expect(normalizeSlug("100%")).toBe("100");
  });
});

describe("findBairro", () => {
  test("the same bairro, written differently, is exact", () => {
    expect(findBairro("São José", bairros).exact?.slug).toBe("sao-jose");
    expect(findBairro("MATHIAS%20VELHO", bairros).exact?.slug).toBe("mathias-velho");
  });
  test("a start or a word of the name suggests it", () => {
    expect(findBairro("mathias", bairros).near.map((b) => b.slug)).toEqual(["mathias-velho"]);
    expect(findBairro("velho", bairros).near.map((b) => b.slug)).toEqual(["mathias-velho"]);
    expect(findBairro("sao", bairros).near.map((b) => b.slug)).toEqual(["sao-jose", "sao-luis"]);
  });
  test("a typo of a letter or two suggests it", () => {
    expect(findBairro("guajuvira", bairros).near.map((b) => b.slug)).toEqual(["guajuviras"]);
    expect(findBairro("senhora-das-grasas", bairros).near).toEqual([]);
    expect(findBairro("gracas", bairros).near.map((b) => b.slug)).toEqual(["nossa-senhora-das-gracas"]);
  });
  test("nothing close: nothing suggested", () => {
    expect(findBairro("porto-alegre", bairros)).toEqual({ exact: null, near: [] });
    expect(findBairro("", bairros)).toEqual({ exact: null, near: [] });
  });
});

describe("looksLikeCode", () => {
  test("five letters and digits, as a code is written", () => {
    expect(looksLikeCode("7K3QF")).toBeTrue();
    expect(looksLikeCode("7k3qf")).toBeTrue();
    expect(looksLikeCode("NHPFV")).toBeTrue();
  });
  test("an ordinary word isn't a code", () => {
    expect(looksLikeCode("sobre")).toBeFalse();
    expect(looksLikeCode("7K3QF9")).toBeFalse();
    expect(looksLikeCode("7K-3Q")).toBeFalse();
  });
});

describe("pathHints", () => {
  test("a code after the domain points to the pin", () => {
    expect(pathHints("/7k3qf", bairros)).toEqual([{ kind: "pin", id: "7K3QF" }]);
  });
  test("a bairro's name anywhere in the last part points to the bairro", () => {
    expect(pathHints("/bairros/mathias", bairros)).toEqual([
      { kind: "bairro", slug: "mathias-velho", name: "Mathias Velho" },
    ]);
    expect(pathHints("/centro/", bairros)).toEqual([{ kind: "bairro", slug: "centro", name: "Centro" }]);
  });
  test("nothing to go on", () => {
    expect(pathHints("/", bairros)).toEqual([]);
    expect(pathHints("/sobre-nos", bairros)).toEqual([]);
  });
});

test("shownPath: decoded and cut short", () => {
  expect(shownPath("/s%C3%A3o-jos%C3%A9")).toBe("/são-josé");
  expect(shownPath(`/${"a".repeat(60)}`, 12)).toBe(`/${"a".repeat(10)}…`);
});
