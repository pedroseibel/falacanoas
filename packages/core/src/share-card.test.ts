import { describe, expect, test } from "bun:test";
import { outlineOf, ShareCardSchema, shareCardText, type ItemCard } from "./share-card";

const item: ItemCard = {
  kind: "item",
  title: "Parada de ônibus vira poça a cada chuva",
  category: "Rua que alaga toda chuva",
  place: "Niterói",
  days: 43,
  open: true,
  demo: true,
  photo: null,
  outline: null,
  link: "falacanoas.com.br/o/7K3QF",
};

describe("shareCardText", () => {
  test("an open pin reads its clock; a fixed one, how long it took", () => {
    expect(shareCardText(item)).toBe(
      "Parada de ônibus vira poça a cada chuva: 43 dias em aberto. Rua que alaga toda chuva, Niterói.",
    );
    expect(shareCardText({ ...item, open: false, days: 1, place: null })).toBe(
      "Parada de ônibus vira poça a cada chuva: resolvido em 1 dia. Rua que alaga toda chuva.",
    );
  });

  test("a bairro reads its counts, the overdue ones only when there are any", () => {
    const bairro = {
      kind: "bairro" as const,
      name: "Niterói",
      open: 29,
      overdue: 12,
      deadlineDays: 30,
      demo: true,
      outline: null,
      link: "falacanoas.com.br/bairro/niteroi",
    };
    expect(shareCardText(bairro)).toBe("Niterói: 29 registros abertos, 12 há mais de 30 dias.");
    expect(shareCardText({ ...bairro, open: 1, overdue: 0 })).toBe("Niterói: 1 registro aberto.");
  });
});

test("the schema refuses a card it can't draw", () => {
  expect(ShareCardSchema.safeParse(item).success).toBeTrue();
  expect(ShareCardSchema.safeParse({ ...item, days: -1 }).success).toBeFalse();
});

test("outlineOf: a square bairro fills its width, north up, with one closed ring", () => {
  const square = {
    type: "Feature" as const,
    properties: { slug: "quadrado", name: "Quadrado" },
    geometry: {
      type: "Polygon" as const,
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
      ],
    },
  };
  const o = outlineOf(square, 100);
  expect(o.width).toBe(100);
  expect(o.height).toBe(100);
  expect(o.d.startsWith("M0.0 100.0L100.0 100.0")).toBeTrue();
  expect(o.d.endsWith("Z")).toBeTrue();
  expect(o.pin).toBeNull();
  expect(outlineOf(square, 100, { lng: 0.25, lat: 0.75 }).pin).toEqual({ x: 25, y: 25 });
});
