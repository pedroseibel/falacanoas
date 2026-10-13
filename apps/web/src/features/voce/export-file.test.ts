import { expect, test } from "bun:test";
import { exportFileName } from "./export-file";

test("the export is named by the instance's date, not UTC's", () => {
  // 01:30 UTC on the 13th is still the 12th in Canoas.
  expect(exportFileName(new Date("2026-10-13T01:30:00Z"), "America/Sao_Paulo")).toBe(
    "fala-canoas-meus-dados-2026-10-12.json",
  );
});
