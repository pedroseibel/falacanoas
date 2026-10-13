import { describe, expect, test } from "bun:test";
import {
  NickSchema,
  initials,
  isBrazilianMobileE164,
  maskedPhone,
  nickAvailable,
  nickKey,
  nickProblem,
  suggestNicks,
  toE164BR,
} from "./identity";

describe("toE164BR", () => {
  test("accepts the common ways a number is typed", () => {
    expect(toE164BR("(51) 99999-8888")).toBe("+5551999998888");
    expect(toE164BR("51999998888")).toBe("+5551999998888");
    expect(toE164BR("+55 51 99999 8888")).toBe("+5551999998888");
    expect(toE164BR("(51) 3456-7890")).toBe("+555134567890");
  });
  test("rejects incomplete or malformed numbers", () => {
    expect(toE164BR("9999-8888")).toBeNull();
    expect(toE164BR("(51) 89999-8888")).toBeNull();
    expect(toE164BR("(05) 99999-8888")).toBeNull();
  });
});

test("only mobiles can receive sign-in codes", () => {
  expect(isBrazilianMobileE164("+5551999998888")).toBe(true);
  expect(isBrazilianMobileE164("+555134567890")).toBe(false);
});

test("maskedPhone shows just enough", () => expect(maskedPhone("+5551999998888")).toBe("(51) 9…8888"));

describe("NickSchema", () => {
  test("accepts apelidos like the ones on the map", () => {
    expect(NickSchema.parse("garça-do-sinos")).toBe("garça-do-sinos");
    expect(NickSchema.parse("  Timbaúva-12 ")).toBe("timbaúva-12");
  });
  test("rejects spaces, short names and digit runs", () => {
    expect(NickSchema.safeParse("ana paula").success).toBe(false);
    expect(NickSchema.safeParse("ab").success).toBe(false);
    expect(NickSchema.safeParse("vizinho-51999998888").success).toBe(false);
  });
});

describe("nickProblem (round 19)", () => {
  test("insults and official-sounding names are refused, accents and case ignored", () => {
    expect(nickProblem("fdp-do-bairro")).toBe("offensive");
    expect(nickProblem("ouvidoria-canoas")).toBe("official");
    expect(nickProblem("Prefeitura")).toBe("official");
    expect(nickProblem("câmara-de-canoas")).toBe("official");
    expect(nickProblem("defesa-civil-rs")).toBe("official");
    expect(nickProblem("fala-canoas")).toBe("official");
    expect(NickSchema.safeParse("moderador-centro").success).toBe(false);
  });
  test("whole words only: ordinary apelidos pass", () => {
    expect(nickProblem("garça-do-parque")).toBeNull();
    expect(nickProblem("rafaela-da-praça")).toBeNull();
    expect(nickProblem("falante-do-sinos")).toBeNull();
  });
});

test("suggestNicks returns distinct, valid apelidos", () => {
  const nicks = suggestNicks();
  expect(new Set(nicks).size).toBe(3);
  // Every bird × place combination must pass, not just the ones this run happened to draw.
  for (let i = 0; i < 10; i++)
    for (let j = 0; j < 10; j++) {
      const seq = [i / 10 + 0.01, j / 10 + 0.01];
      const [nick] = suggestNicks(() => seq.shift() ?? 0, 1);
      expect(NickSchema.safeParse(nick).success).toBe(true);
    }
});

test("initials skip short joining words", () => {
  expect(initials("garça-do-sinos")).toBe("GS");
  expect(initials("quero-quero-da-praça")).toBe("QQ");
});

describe("apelido reservation", () => {
  const day = 864e5;
  const now = 1_000 * day;
  test("accents, hyphens and look-alikes collide", () => {
    expect(nickKey("garça-do-sinos")).toBe(nickKey("garca-d0-sinos"));
    expect(nickKey("garça-do-sinos")).toBe(nickKey("GARCADOSINOS"));
    expect(nickKey("sabiá-1")).toBe(nickKey("sabia-l"));
    expect(nickKey("garça-do-sinos")).not.toBe(nickKey("garça-do-ipê"));
  });
  test("free names and your own are available", () => {
    expect(nickAvailable(undefined, "a", now)).toBeTrue();
    expect(nickAvailable({ ownerId: "a", lastOwnerId: "a", published: true, releasedAt: null }, "a", now)).toBeTrue();
  });
  test("a name held by another account is not", () =>
    expect(
      nickAvailable({ ownerId: "b", lastOwnerId: "b", published: false, releasedAt: null }, "a", now),
    ).toBeFalse());
  test("a released name that signed something is never reused", () =>
    expect(
      nickAvailable({ ownerId: null, lastOwnerId: "b", published: true, releasedAt: now - 9000 * day }, "a", now),
    ).toBeFalse());
  test("an unpublished name is held for 90 days", () => {
    const r = (daysAgo: number) => ({
      ownerId: null,
      lastOwnerId: "b",
      published: false,
      releasedAt: now - daysAgo * day,
    });
    expect(nickAvailable(r(89), "a", now)).toBeFalse();
    expect(nickAvailable(r(90), "a", now)).toBeTrue();
  });
  test("its last owner can take it back", () =>
    expect(nickAvailable({ ownerId: null, lastOwnerId: "a", published: true, releasedAt: now }, "a", now)).toBeTrue());
});
