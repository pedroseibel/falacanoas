import { expect, test } from "bun:test";
import { loadConfig } from "./config";

test("production needs its addresses and database; development falls back to placeholders", () => {
  expect(() => loadConfig({ DIGEST_MODE: "production" })).toThrow(/DIGEST_DATABASE_URL.*DIGEST_FROM.*DIGEST_TO/);
  const dev = loadConfig({ DIGEST_DATABASE_URL: "postgres://x" });
  expect(dev.mode).toBe("development");
  expect(dev.to.every((a) => a.endsWith(".invalid"))).toBeTrue();
  expect(dev.token).toBe("");
});

test("addresses are comma-separated lists", () => {
  const c = loadConfig({
    DIGEST_MODE: "production",
    DIGEST_DATABASE_URL: "postgres://x",
    DIGEST_FROM: "Fala <r@x.br>",
    DIGEST_TO: " ouvidoria@x.br , ",
    DIGEST_CC: "cac@x.br,outro@x.br",
  });
  expect(c.to).toEqual(["ouvidoria@x.br"]);
  expect(c.cc).toEqual(["cac@x.br", "outro@x.br"]);
});

test("refuses a transaction-mode pooler, where the run's lock wouldn't hold", () => {
  expect(() => loadConfig({ DIGEST_DATABASE_URL: "postgres://u:p@aws-0.pooler.supabase.com:6543/postgres" })).toThrow(
    /sessão/,
  );
  expect(loadConfig({ DIGEST_DATABASE_URL: "postgres://u:p@aws-0.pooler.supabase.com:5432/postgres" }).mode).toBe(
    "development",
  );
});
