import { describe, expect, test } from "bun:test";
import { hashMatchingRequired, isCleared, readScreen, visibleToModerators } from "./known-material";

const service = {
  nudity: 0.02,
  faces: [{ x: 1 }],
  plates: [],
  width: 10,
  height: 10,
  ms: 5,
  pdq: { hex: "ab".repeat(32), quality: 92 },
  known: { classification: "no-known-match", matchType: null, databaseVersion: "1760000000" },
};

describe("readScreen", () => {
  test("the screening and the verdict, field by field", () => {
    expect(readScreen("k1", service)).toEqual({
      storageKey: "k1",
      nudity: 0.02,
      faces: 1,
      plates: 0,
      pdq: "ab".repeat(32),
      pdqQuality: 92,
      known: "no-known-match",
      knownMatch: null,
      knownDbVersion: "1760000000",
    });
  });
  test("no verdict when the service couldn't check; an unknown class is no verdict either", () => {
    expect(readScreen("k1", { ...service, known: null, knownError: "503" })?.known).toBeNull();
    expect(readScreen("k1", { ...service, known: { classification: "probably-fine" } })?.known).toBeNull();
  });
  test("a malformed answer is nothing", () => {
    expect(readScreen("k1", { nudity: "x" })).toBeNull();
    expect(readScreen("k1", null)).toBeNull();
  });
});

const verdict = (known: string | null, knownReview: string | null = null) => ({ known, knownReview });

describe("who may see a photo", () => {
  test("cleared: no match, too flat to fingerprint, or released by the designated person", () => {
    expect(isCleared(verdict("no-known-match"))).toBeTrue();
    expect(isCleared(verdict("unhashable"))).toBeTrue();
    expect(isCleared(verdict("harmful-abusive-material", "released"))).toBeTrue();
    expect(isCleared(verdict("csam"))).toBeFalse();
    expect(isCleared(verdict("harmful-abusive-material"))).toBeFalse();
    expect(isCleared(verdict(null))).toBeFalse();
    expect(isCleared(null)).toBeFalse();
  });
  test("pending or removed photos need the check when it's required; approved ones are public already", () => {
    expect(visibleToModerators("pending", null, true)).toBeFalse();
    expect(visibleToModerators("removed", verdict(null), true)).toBeFalse();
    expect(visibleToModerators("pending", verdict("no-known-match"), true)).toBeTrue();
    expect(visibleToModerators("approved", null, true)).toBeTrue();
    expect(visibleToModerators("pending", null, false)).toBeTrue();
  });
  test("required unless switched off; development leaves it off by default", () => {
    expect(hashMatchingRequired({ HASH_MATCHING: "required" })).toBeTrue();
    expect(hashMatchingRequired({ HASH_MATCHING: "off" })).toBeFalse();
  });
});
