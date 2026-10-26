import { describe, expect, test } from "bun:test";
import { FloodNotesSchema, asksFlooding, floodLines, floodNotesFor } from "./flooding";

const muni = {
  categories: [
    {
      key: "alaga",
      label: "Rua que alaga",
      group: "agua",
      agency: null,
      kind: "occurrence" as const,
      asks: "flooding" as const,
    },
    { key: "buraco", label: "Buraco", group: "ruas", agency: null, kind: "occurrence" as const },
  ],
};

describe("the flooding questions", () => {
  test("are asked only on the types the instance marks", () => {
    expect(asksFlooding(muni, "alaga")).toBeTrue();
    expect(asksFlooding(muni, "buraco")).toBeFalse();
    expect(asksFlooding(muni, "")).toBeFalse();
  });

  test("keep what was answered, and nothing when nothing was", () => {
    expect(floodNotesFor(muni, "alaga", { cause: "bombas", raining: false })).toEqual({
      cause: "bombas",
      raining: false,
    });
    expect(floodNotesFor(muni, "alaga", {})).toBeUndefined();
    expect(floodNotesFor(muni, "buraco", { cause: "rio" })).toBeUndefined();
  });

  test("refuse answers outside the options", () => {
    expect(FloodNotesSchema.safeParse({ cause: "chuva forte" }).success).toBeFalse();
    expect(FloodNotesSchema.safeParse({ duration: "2h" }).success).toBeFalse();
    expect(FloodNotesSchema.safeParse({ raining: "sim" }).success).toBeFalse();
  });

  test("read back in the reporter's words, one line each", () => {
    expect(floodLines({ cause: "bueiro", raining: true, duration: "1_3h" })).toEqual([
      { term: "O que viu", value: "bueiro entupido" },
      { term: "Na hora", value: "estava chovendo" },
      { term: "A água", value: "ficou de 1 a 3 horas" },
    ]);
    expect(floodLines({ cause: "nao_sei", raining: false, duration: "ainda" })).toEqual([
      { term: "O que viu", value: "não soube dizer a causa" },
      { term: "Na hora", value: "não estava chovendo" },
      { term: "A água", value: "ainda não tinha baixado" },
    ]);
    expect(floodLines({})).toEqual([]);
  });
});
