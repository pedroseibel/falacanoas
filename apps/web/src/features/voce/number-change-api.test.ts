import { expect, test } from "bun:test";
import { CHANGE_FAILURE_MESSAGE, changeFailure } from "./number-change-api";

test("the vault's answer names the failure; anything else reads as not sent", () => {
  expect(changeFailure({ ok: false, error: "taken" })).toBe("taken");
  expect(changeFailure({ ok: false, error: "robot" })).toBe("send");
  expect(changeFailure(null)).toBe("send");
  expect(CHANGE_FAILURE_MESSAGE.same).toBe("Esse já é o número da sua conta.");
});
