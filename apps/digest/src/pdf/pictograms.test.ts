import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PICTOGRAMS, pictogramFor } from "./pictograms";

const icons = readFileSync(fileURLToPath(new URL("../../../web/src/components/Icons.tsx", import.meta.url)), "utf8");

describe("pictograms", () => {
  test("match the app's category symbols, one for one", () => {
    const symbols = [...icons.matchAll(/<symbol id="c-([a-z]+)" viewBox="([^"]+)">([\s\S]*?)<\/symbol>/g)];
    expect(symbols.length).toBeGreaterThan(0);
    expect(Object.keys(PICTOGRAMS).toSorted()).toEqual(symbols.map((m) => m[1] ?? "").toSorted());
    for (const [, key, viewBox, body] of symbols)
      expect(PICTOGRAMS[key ?? ""]).toBe(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="currentColor">${body}</svg>`,
      );
  });

  test("a category without its own falls back to the generic one", () => {
    expect(pictogramFor("nao-existe")).toBe(PICTOGRAMS["questao"] ?? "");
    expect(pictogramFor("buraco")).toContain("<svg");
  });
});
