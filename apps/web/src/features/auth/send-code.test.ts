import { expect, test } from "bun:test";
import { sendFailure } from "./send-code";

test("too many requests, the robot check, anything else", () => {
  expect(sendFailure(429)).toBe("rate");
  expect(sendFailure(400)).toBe("robot");
  expect(sendFailure(403)).toBe("robot");
  expect(sendFailure(500)).toBe("send");
  expect(sendFailure(undefined)).toBe("send");
});
