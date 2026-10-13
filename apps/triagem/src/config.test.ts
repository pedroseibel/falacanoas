import { expect, test } from "bun:test";
import { loadConfig } from "./config";

test("production refuses to start without a long token", () => {
  expect(() => loadConfig({ NODE_ENV: "production" })).toThrow("TRIAGEM_TOKEN");
  expect(() => loadConfig({ NODE_ENV: "production", TRIAGEM_TOKEN: "short" })).toThrow("TRIAGEM_TOKEN");
  expect(loadConfig({ NODE_ENV: "production", TRIAGEM_TOKEN: "x".repeat(32) }).token).toBe("x".repeat(32));
});

test("development may run open, on 3500", () => {
  expect(loadConfig({})).toEqual({ mode: "development", token: null, port: 3500, host: "127.0.0.1" });
});
