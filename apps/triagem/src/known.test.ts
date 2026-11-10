import { describe, expect, test } from "bun:test";
import { readVerdict, shield } from "./known";
import { toBase64 } from "./pdq";

const hex = "d8f8f0cce0f4a84f0e370a22028f67f0b36e2ed596623e1d33e6b39c4e9c9b22";
const strong = { hex, quality: 100 };
const unavailable = async () => new Response("no", { status: 503 });

describe("readVerdict", () => {
  test("no match anywhere", () => {
    expect(
      readVerdict({ scanned_hashes: { a: null, b: { classification: "no-known-match", match_type: null } } }),
    ).toEqual({
      classification: "no-known-match",
      matchType: null,
    });
  });
  test("the worst class among the orientations decides", () => {
    expect(
      readVerdict({
        scanned_hashes: {
          a: { classification: "harmful-abusive-material", match_type: "near" },
          b: { classification: "csam", match_type: "near" },
          c: null,
        },
      }),
    ).toEqual({ classification: "csam", matchType: "near" });
  });
  test("anything unexpected is an error, never a clean bill", () => {
    expect(() => readVerdict({})).toThrow();
    expect(() => readVerdict({ scanned_hashes: {} })).toThrow();
    expect(() => readVerdict({ scanned_hashes: { a: { classification: "maybe" } } })).toThrow();
  });
});

describe("shield", () => {
  const config = { url: "https://shield.test/", username: "fala", password: "segredo" };

  test("sends only base64 fingerprints, with basic auth, and records the database version", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetcher = async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (url.endsWith("/v1/version")) return Response.json({ last_updated_at: "1760000000" });
      return Response.json({ scanned_hashes: { [toBase64(hex)]: null } });
    };
    const verdict = await shield(config, fetcher).check(strong, [hex, "00".repeat(32)]);
    expect(verdict).toEqual({ classification: "no-known-match", matchType: null, databaseVersion: "1760000000" });
    const scan = calls.find((c) => c.url === "https://shield.test/v1/pdq");
    // Deduplicated, base64, and nothing else in the body: no account, place, time or file name.
    expect(JSON.parse(String(scan?.init?.body))).toEqual({ hashes: [toBase64(hex), toBase64("00".repeat(32))] });
    expect(new Headers(scan?.init?.headers).get("authorization")).toBe(
      `Basic ${Buffer.from("fala:segredo").toString("base64")}`,
    );
  });

  test("a weak fingerprint isn't sent: too little texture to compare", async () => {
    let called = false;
    const fetcher = async () => {
      called = true;
      return Response.json({});
    };
    expect(await shield(config, fetcher).check({ hex, quality: 30 }, [hex])).toEqual({
      classification: "unhashable",
      matchType: null,
      databaseVersion: null,
    });
    expect(called).toBeFalse();
  });

  test("an error from Shield throws, so the photo waits instead of passing", async () => {
    await expect(shield(config, unavailable).check(strong, [hex])).rejects.toThrow(/503/);
  });
});
