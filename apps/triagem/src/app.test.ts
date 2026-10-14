import { describe, expect, test } from "bun:test";
import { buildApp, type Engine } from "./app";
import type { Config } from "./config";
import type { KnownVerdict, Shield } from "./known";

const screening = { nudity: 0.9, faces: [], plates: [], width: 10, height: 10, ms: 1 };
const print = { hash: { hex: "ab".repeat(32), quality: 100 }, orientations: ["ab".repeat(32)] };
const engine: Engine = {
  screen: () => Promise.resolve(screening),
  blur: () => Promise.resolve({ bytes: Buffer.from("x"), type: "image/jpeg" }),
  fingerprint: () => Promise.resolve(print),
};
const post = (app: ReturnType<typeof buildApp>, path: string, body: BodyInit, token?: string) =>
  app.handle(
    new Request(`http://local${path}`, {
      method: "POST",
      body,
      headers: token ? { authorization: `Bearer ${token}` } : {},
    }),
  );

describe("the screening API", () => {
  const token = "t".repeat(32);
  const config: Config = { mode: "production", token, port: 0, host: "127.0.0.1", shield: null };
  const app = buildApp(config, engine);

  test("answers only with the app's token", async () => {
    expect((await post(app, "/triagem", "abc")).status).toBe(401);
    expect((await post(app, "/triagem", "abc", "wrong")).status).toBe(401);
    const ok = await post(app, "/triagem", "abc", token);
    expect(ok.status).toBe(200);
    // Without a Shield account: the fingerprint, and no check.
    expect(await ok.json()).toEqual({ ...screening, pdq: print.hash, known: null });
  });

  test("with Shield: its verdict; when Shield fails, no verdict and the reason", async () => {
    const verdict: KnownVerdict = { classification: "no-known-match", matchType: null, databaseVersion: "1760000000" };
    const ok: Shield = { check: () => Promise.resolve(verdict) };
    const down: Shield = { check: () => Promise.reject(new Error("Arachnid Shield respondeu 503")) };
    const checked = await post(buildApp(config, engine, ok), "/triagem", "abc", token);
    expect(await checked.json()).toMatchObject({ pdq: print.hash, known: verdict });
    const failed = await post(buildApp(config, engine, down), "/triagem", "abc", token);
    expect(await failed.json()).toMatchObject({ known: null, knownError: "Arachnid Shield respondeu 503" });
  });

  test("refuses an empty body", async () => {
    expect((await post(app, "/triagem", "", token)).status).toBe(413);
  });

  test("returns the blurred copy with what it found", async () => {
    const res = await post(app, "/borrar", "abc", token);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("x-faces")).toBe("0");
  });
});
