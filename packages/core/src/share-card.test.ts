import { expect, test } from "bun:test";
import { outlineOf, ShareCardSchema, type ItemCard } from "./share-card";

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
