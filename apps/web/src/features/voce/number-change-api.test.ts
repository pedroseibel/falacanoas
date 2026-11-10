import { expect, test } from "bun:test";
import { changeFailure } from "./number-change-api";

test("the vault's answer names the failure; anything else reads as not sent", () => {
  expect(changeFailure({ ok: false, error: "taken" })).toBe("taken");
  expect(changeFailure({ ok: false, error: "robot" })).toBe("send");
  expect(changeFailure(null)).toBe("send");
});
