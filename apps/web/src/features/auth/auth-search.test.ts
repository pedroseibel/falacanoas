import { describe, expect, test } from "bun:test";
import { AuthSearchSchema, returnPath } from "./auth-search";

const parse = (v: unknown) => AuthSearchSchema.parse(v);

describe("return path", () => {
  test("paths inside the app are kept, with their query", () =>
    expect(returnPath(parse({ volta: "/o/7K3QF?f=agua" }))).toBe("/o/7K3QF?f=agua"));
  test("no path goes back to the map", () => expect(returnPath(parse({}))).toBe("/mapa"));
  test("other sites are refused", () => {
    for (const volta of ["https://exemplo.com", "//exemplo.com", "/\\exemplo.com", "mapa"])
      expect(parse({ volta }).volta).toBeUndefined();
  });
  test("the sign-in pages never return to themselves", () => {
    expect(parse({ volta: "/entrar" }).volta).toBeUndefined();
    expect(parse({ volta: "/bem-vindo?volta=/mapa" }).volta).toBeUndefined();
    expect(parse({ volta: "/entrada-do-bairro" }).volta).toBe("/entrada-do-bairro");
  });
  test("unknown intents are dropped", () => expect(parse({ depois: "apagar" }).depois).toBeUndefined());
});
