import { expect, test } from "bun:test";
import { canoas } from "@fala/instance-canoas";
import { loadConfig } from "./config";

const asRole = (role: string) => `postgres://${role}.ref:x@aws-0.pooler.supabase.com:5432/postgres`;

test("connects only as fala_dados, never with a role that can read the tables", () => {
  expect(() => loadConfig(canoas, { DADOS_DATABASE_URL: asRole("fala_app") })).toThrow(/fala_dados/);
  expect(() => loadConfig(canoas, { DADOS_DATABASE_URL: asRole("postgres") })).toThrow(/fala_dados/);
  expect(loadConfig(canoas, { DADOS_DATABASE_URL: asRole("fala_dados") }).mode).toBe("development");
});

test("production waits for the instance's licence", () => {
  const env = { DADOS_MODE: "production", DADOS_DATABASE_URL: asRole("fala_dados") };
  expect(() => loadConfig({ ...canoas, openDataLicence: undefined }, env)).toThrow(/licença/);
  expect(loadConfig({ ...canoas, openDataLicence: "ODbL-1.0" }, env).mode).toBe("production");
});
