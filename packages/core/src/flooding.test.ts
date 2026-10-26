import { describe, expect, test } from "bun:test";
import { FloodNotesSchema, asksFlooding, floodLines, floodNotesFor, freshFlood, freshLine, freshTag } from "./flooding";

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

describe("fresh flooding reports", () => {
  const now = new Date("2026-10-26T19:00:00Z");
  const at = (min: number) => new Date(now.getTime() - min * 60_000).toISOString();

  test("a flooding record from the last three hours is fresh, and says when it was seen", () => {
    const f = freshFlood(
      muni,
      { category: "alaga", createdAt: at(40), lastSeenAt: at(40), flooding: { duration: "ainda" } },
      now,
    );
    expect(f).toEqual({ minutes: 40, photo: false, stillThere: true });
    if (!f) throw new Error("fresco");
    expect(freshTag(f)).toBe("há 40 min · não baixou");
    expect(freshLine(f)).toBe("Registrado há 40 min; a água ainda não tinha baixado.");
  });

  test("a new photo on an older record makes it fresh again, without its old answer", () => {
    const f = freshFlood(
      muni,
      { category: "alaga", createdAt: at(60 * 24 * 9), lastSeenAt: at(130), flooding: { duration: "ainda" } },
      now,
    );
    expect(f).toEqual({ minutes: 130, photo: true, stillThere: false });
    if (!f) throw new Error("fresco");
    expect(freshLine(f)).toBe("Foto nova há 2 h.");
  });

  test("expires after three hours, and only flooding types are fresh", () => {
    expect(freshFlood(muni, { category: "alaga", createdAt: at(181), lastSeenAt: at(181) }, now)).toBeNull();
    expect(freshFlood(muni, { category: "buraco", createdAt: at(5), lastSeenAt: at(5) }, now)).toBeNull();
    expect(freshFlood(muni, { category: "alaga" }, now)).toBeNull();
  });
});
