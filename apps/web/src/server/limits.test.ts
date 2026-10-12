import { describe, expect, test } from "bun:test";
import { CODE_WINDOWS, admit } from "./limits";

describe("admit", () => {
  const min = 60_000;
  test("three codes in 15 minutes, then a wait", () => {
    let hits: number[] = [];
    for (const t of [0, 1, 2]) {
      const r = admit(hits, t * min, CODE_WINDOWS);
      expect(r.ok).toBeTrue();
      hits = r.hits;
    }
    expect(admit(hits, 3 * min, CODE_WINDOWS).ok).toBeFalse();
    expect(admit(hits, 15 * min, CODE_WINDOWS).ok).toBeTrue();
  });
  test("ten a day, however they are spaced", () => {
    let hits: number[] = [];
    for (let i = 0; i < 10; i++) hits = admit(hits, i * 20 * min, CODE_WINDOWS).hits;
    expect(hits).toHaveLength(10);
    expect(admit(hits, 10 * 20 * min, CODE_WINDOWS).ok).toBeFalse();
    expect(admit(hits, 24 * 60 * min + 1, CODE_WINDOWS).ok).toBeTrue();
  });
  test("a refused hit isn't recorded", () => {
    const full = [0, 1, 2];
    expect(admit(full, 3, [{ ms: 100, max: 3 }]).hits).toEqual(full);
  });
});
