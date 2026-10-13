import { describe, expect, test } from "bun:test";
import { buildApp, type Engine } from "./app";

const screening = { nudity: 0.9, faces: [], plates: [], width: 10, height: 10, ms: 1 };
const engine: Engine = {
  screen: () => Promise.resolve(screening),
  blur: () => Promise.resolve({ bytes: Buffer.from("x"), type: "image/jpeg" }),
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
  const app = buildApp({ mode: "production", token, port: 0, host: "127.0.0.1" }, engine);

  test("answers only with the app's token", async () => {
    expect((await post(app, "/triagem", "abc")).status).toBe(401);
    expect((await post(app, "/triagem", "abc", "wrong")).status).toBe(401);
    const ok = await post(app, "/triagem", "abc", token);
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual(screening);
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
