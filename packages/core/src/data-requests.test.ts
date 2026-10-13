import { describe, expect, test } from "bun:test";
import { DataRequestSchema, newProtocol, parseItemRef } from "./data-requests";

describe("parseItemRef", () => {
  test("a bare code, any case", () => {
    expect(parseItemRef(" 7k3qf ")).toEqual({ id: "7K3QF", key: null });
  });

  test("a link, with or without the scheme, or just the path", () => {
    expect(parseItemRef("https://falacanoas.com.br/o/7K3QF")).toEqual({ id: "7K3QF", key: null });
    expect(parseItemRef("falacanoas.com.br/o/7K3QF/")).toEqual({ id: "7K3QF", key: null });
    expect(parseItemRef("/o/7K3QF")).toEqual({ id: "7K3QF", key: null });
  });

  test("a guest's secret link carries its key", () => {
    expect(parseItemRef("https://falacanoas.com.br/o/AC3DE?chave=abc_DEF-123")).toEqual({
      id: "AC3DE",
      key: "abc_DEF-123",
    });
  });

  test("anything else is not a pin", () => {
    expect(parseItemRef("")).toBeNull();
    expect(parseItemRef("a foto da parada")).toBeNull();
    expect(parseItemRef("https://falacanoas.com.br/bairro/niteroi")).toBeNull();
    expect(parseItemRef("ab")).toBeNull();
  });
});

describe("DataRequestSchema", () => {
  const ok = {
    requester: "in_content",
    kind: "content",
    item: "7K3QF",
    text: "Meu rosto aparece na foto deste registro, quero que seja ocultado.",
    contact: "maria@example.com",
  };

  test("a complete request passes; the item is optional", () => {
    expect(DataRequestSchema.safeParse(ok).success).toBeTrue();
    expect(DataRequestSchema.safeParse({ ...ok, item: "" }).success).toBeTrue();
  });

  test("each problem names its field", () => {
    const r = DataRequestSchema.safeParse({ ...ok, item: "a parada", text: "oi", contact: "maria" });
    expect(r.success).toBeFalse();
    expect(r.error?.issues.map((i) => i.path[0]).toSorted()).toEqual(["contact", "item", "text"]);
  });
});

test("newProtocol: PD- and six readable characters", () => {
  expect(newProtocol([0, 1, 2, 3, 4, 5])).toMatch(/^PD-[ACDEFHJKMNPRTUVWXY3479]{6}$/);
});
