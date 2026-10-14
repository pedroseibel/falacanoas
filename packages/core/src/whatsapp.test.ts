import { describe, expect, test } from "bun:test";
import type { Municipality } from "./types";
import { judgeConfirmation, readIntent, replyFor, whatsappVariants } from "./whatsapp";

const muni: Municipality = {
  slug: "teste",
  name: "Teste",
  state: "RS",
  country: "BR",
  locale: "pt-BR",
  timezone: "America/Sao_Paulo",
  center: [-51.15, -29.95],
  bounds: [
    [-51.2, -30],
    [-51.1, -29.9],
  ],
  deadlineDays: 30,
  digestHour: 18,
  categories: [],
  filterGroups: [],
  neighborhoods: [
    { slug: "centro", name: "Centro", threshold: 100, center: [-51.15, -29.95], bbox: [0, 0, 0, 0] },
    { slug: "ilha", name: "Ilha", threshold: null, center: [-51.15, -29.95], bbox: [0, 0, 0, 0] },
  ],
  geo: {
    neighborhoods: { type: "FeatureCollection", features: [] },
    boundary: { type: "FeatureCollection", features: [] },
  },
  branding: { name: "Fala, Teste", domain: "fala.test" },
};

describe("readIntent", () => {
  test("the pre-filled message, however it was typed", () => {
    expect(readIntent("CONFIRMAR K7HA")).toEqual({ kind: "confirm", code: "K7HA" });
    expect(readIntent("  confirmar: k7ha. ")).toEqual({ kind: "confirm", code: "K7HA" });
    expect(readIntent("Confirmar\nK7HA")).toEqual({ kind: "confirm", code: "K7HA" });
  });
  test("a bare code only when it could be one", () => {
    expect(readIntent("k7ha")).toEqual({ kind: "confirm", code: "K7HA" });
    expect(readIntent("BLZA")).toEqual({ kind: "other" });
    expect(readIntent("oiee")).toEqual({ kind: "other" });
  });
  test("leaving, in the words people use", () => {
    for (const t of ["SAIR", "sair", "Parar!", "cancelar", "STOP"]) expect(readIntent(t)).toEqual({ kind: "leave" });
    expect(readIntent("quero sair do grupo")).toEqual({ kind: "other" });
  });
  test("anything else", () => expect(readIntent("Tem um buraco na minha rua")).toEqual({ kind: "other" }));
});

describe("whatsappVariants", () => {
  test("a mobile with the ninth digit also matches without it, and back", () => {
    expect(whatsappVariants("5551988887777")).toEqual(["5551988887777", "555188887777"]);
    expect(whatsappVariants("555188887777")).toEqual(["555188887777", "5551988887777"]);
  });
  test("landlines and other countries stay as they are", () => {
    expect(whatsappVariants("555134567890")).toEqual(["555134567890"]);
    expect(whatsappVariants("14155550123")).toEqual(["14155550123"]);
    expect(whatsappVariants("+55 (51) 98888-7777")).toEqual(["5551988887777", "555188887777"]);
  });
});

describe("judgeConfirmation", () => {
  const signup = { neighborhood: "centro", code: "K7HA", confirmed: false };
  test("the right code confirms", () => expect(judgeConfirmation(signup, "K7HA")).toBeNull());
  test("a wrong code doesn't", () => expect(judgeConfirmation(signup, "AAAA")).toEqual({ kind: "wrong-code" }));
  test("confirmed once is confirmed, whatever is sent", () =>
    expect(judgeConfirmation({ ...signup, confirmed: true }, "AAAA")).toEqual({
      kind: "already",
      neighborhood: "centro",
    }));
  test("no sign-up for this number", () => expect(judgeConfirmation(null, "K7HA")).toEqual({ kind: "unknown" }));
});

describe("replyFor", () => {
  test("confirmed: what's missing, the bairro's link, and how to leave", () => {
    const text = replyFor({ kind: "confirmed", neighborhood: "centro", confirmedInBairro: 99 }, muni);
    expect(text).toContain("fila de Centro está confirmada");
    expect(text).toContain("Falta 1 inscrição para o Fala, Teste abrir em Centro");
    expect(text).toContain("https://fala.test/?b=centro");
    expect(text).toContain("responda SAIR");
  });
  test("a bairro with no threshold, or a full one, doesn't count down", () => {
    expect(replyFor({ kind: "confirmed", neighborhood: "ilha", confirmedInBairro: 1 }, muni)).toContain(
      "está completa",
    );
  });
  test("anything else points to the site and the emergency numbers", () => {
    const text = replyFor({ kind: "other" }, muni);
    expect(text).toContain("https://fala.test");
    expect(text).toContain("Defesa Civil 199");
    expect(text).toContain("só confirma inscrições");
    expect(replyFor({ kind: "other" }, muni, { reporting: true })).toContain("mande REGISTRAR");
  });
});
