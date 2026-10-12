import { describe, expect, test } from "bun:test";
import { NickSchema, initials, isBrazilianMobileE164, maskedPhone, suggestNicks, toE164BR } from "./identity";

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
