import { describe, expect, test } from "bun:test";
import type { Neighborhood } from "@fala/core";
import { bairrosByQueue, fmt, litSlots, queueState, shareMessage } from "./landing-model";

const nb = (slug: string, name: string, threshold: number | null): Neighborhood => ({
  slug,
  name,
  threshold,
  center: [0, 0],
  bbox: [0, 0, 0, 0],
});
const all = [
  nb("industrial", "Industrial", null),
  nb("centro", "Centro", 52),
  nb("brigadeira", "Brigadeira", null),
  nb("igara", "Igara", 67),
];

test("fmt uses pt-BR thousands", () => {
  expect(fmt(2772)).toBe("2.772");
  expect(fmt(52)).toBe("52");
});

test("queue order: bairros with a queue first, small ones after, each alphabetical", () =>
  expect(bairrosByQueue(all).map((b) => b.slug)).toEqual(["centro", "igara", "brigadeira", "industrial"]));

describe("queueState", () => {
  test("no bairro", () => expect(queueState(undefined, {})).toEqual({ kind: "none" }));
  test("small bairro opens with the first", () => expect(queueState(all[0], {}).kind).toBe("withFirst"));
  test("missing counts down from the threshold", () =>
    expect(queueState(all[1], { centro: 2 })).toEqual({ kind: "missing", name: "Centro", missing: 50 }));
  test("full queue", () => expect(queueState(all[1], { centro: 60 }).kind).toBe("full"));
});

test("litSlots is proportional and capped at 20", () => {
  expect(litSlots(52, 0)).toBe(0);
  expect(litSlots(52, 26)).toBe(10);
  expect(litSlots(52, 99)).toBe(20);
  expect(litSlots(null, 5)).toBe(0);
});

test("share message names the bairro and links to it", () => {
  const m = shareMessage("falacanoas.com.br", nb("centro", "Centro", 52));
  expect(m).toContain("para Centro");
  expect(m).toContain("Quando 52 vizinhos");
  expect(m).toContain("https://falacanoas.com.br/?b=centro");
});
