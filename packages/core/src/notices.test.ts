import { describe, expect, test } from "bun:test";
import { itemNotice, moderationWaitingNotice, newItemNotice } from "./notices";
import type { Item } from "./types";

const it: Item = {
  id: "7K3QF",
  kind: "occurrence",
  category: "alaga",
  title: "Parada de ônibus vira poça a cada chuva",
  text: "",
  neighborhood: "niteroi",
  scope: { type: "point", lng: -51.16, lat: -29.93 },
  days: 43,
  updatedMinutesAgo: 1,
  confirmations: 0,
  followers: 0,
  updates: 0,
  photos: [],
  visibility: "pseudonymous",
  author: null,
  community: "reported",
  official: null,
};

describe("itemNotice", () => {
  test("says what changed, points at the pin, and groups by it", () => {
    expect(itemNotice(it, { kind: "photo" })).toEqual({
      title: "Parada de ônibus vira poça a cada chuva",
      body: "Chegou uma foto nova.",
      url: "/o/7K3QF",
      tag: "o-7K3QF",
    });
    expect(itemNotice(it, { kind: "resolved" }).body).toBe("Os vizinhos confirmaram que foi resolvido.");
  });

  test("an update is quoted, and clipped when long", () => {
    expect(itemNotice(it, { kind: "update", text: "Choveu e alagou de novo" }).body).toBe(
      "Atualização: “Choveu e alagou de novo”",
    );
    const long = itemNotice(it, { kind: "update", text: "a ".repeat(200) }).body;
    expect(long.length).toBeLessThan(160);
    expect(long.endsWith("…”")).toBeTrue();
  });
});

test("newItemNotice names the followed place and the category", () => {
  const n = newItemNotice(it, { where: "Bairro Niterói", category: "Rua que alaga toda chuva" });
  expect(n.title).toBe("Novo registro · Bairro Niterói");
  expect(n.body).toBe("Rua que alaga toda chuva: Parada de ônibus vira poça a cada chuva");
  expect(n.url).toBe("/o/7K3QF");
  const bare = newItemNotice({ ...it, title: "Buraco na rua" }, { where: "Casa", category: "Buraco na rua" });
  expect(bare.body).toBe("Buraco na rua");
});

describe("moderationWaitingNotice", () => {
  test("one bairro, one case", () => {
    expect(moderationWaitingNotice([{ bairro: "Niterói", count: 1 }], 3)).toEqual({
      title: "Moderação: 1 caso espera há mais de 3 horas",
      body: "Em Niterói. Abra a fila quando puder.",
      url: "/moderar",
      tag: "moderacao",
    });
  });
  test("busiest bairros first; past two, a count", () => {
    const n = moderationWaitingNotice(
      [
        { bairro: "Centro", count: 1 },
        { bairro: "Niterói", count: 4 },
        { bairro: "Fátima", count: 2 },
      ],
      3,
    );
    expect(n.title).toBe("Moderação: 7 casos esperam há mais de 3 horas");
    expect(n.body).toBe("Em Niterói, Fátima e mais 1. Abra a fila quando puder.");
  });
});
