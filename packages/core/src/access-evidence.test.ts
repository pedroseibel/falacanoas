import { describe, expect, test } from "bun:test";
import { connectionFromHeaders, evidenceCutoff, holdActive, type PreservationHold } from "./access-evidence";

describe("connectionFromHeaders", () => {
  test("reads Cloudflare's headers and the Transform Rule's", () => {
    const h = new Headers({
      "cf-connecting-ip": "2804:14c:5b81:8a6c::1",
      "cf-ray": "8f1a2b3c4d5e6f70-GRU",
      "x-fala-client-port": "51234",
      "x-fala-edge-ip": "104.16.0.1",
      "x-fala-edge-port": "443",
      "x-fala-client-tcp": "false",
    });
    expect(connectionFromHeaders(h)).toEqual({
      clientIp: "2804:14c:5b81:8a6c::1",
      clientPort: 51234,
      ipVersion: 6,
      edgeIp: "104.16.0.1",
      edgePort: 443,
      transport: "quic",
      cfRay: "8f1a2b3c4d5e6f70-GRU",
    });
  });

  test("missing or malformed values are null, never guessed", () => {
    const c = connectionFromHeaders(new Headers({ "cf-connecting-ip": "200.1.2.3", "x-fala-client-port": "99999" }));
    expect(c).toMatchObject({ clientIp: "200.1.2.3", ipVersion: 4, clientPort: null, transport: null, edgeIp: null });
    expect(connectionFromHeaders(new Headers({ "x-forwarded-for": "6.6.6.6" })).clientIp).toBeNull();
  });
});

describe("retention", () => {
  test("six calendar months", () => {
    expect(evidenceCutoff(new Date("2026-10-12T15:00:00Z")).toISOString()).toBe("2026-04-12T15:00:00.000Z");
  });

  const base: PreservationHold = {
    requestedAt: new Date("2026-05-01T00:00:00Z"),
    courtOrderSoughtAt: null,
    refusedAt: null,
    endsAt: null,
    releasedAt: null,
  };
  const day = (n: number) => new Date(base.requestedAt.getTime() + n * 864e5);

  test("a request lapses after 60 days without a court order", () => {
    expect(holdActive(base, day(59))).toBeTrue();
    expect(holdActive(base, day(60))).toBeFalse();
  });

  test("seeking the order keeps it until it's refused, released or ends", () => {
    const sought = { ...base, courtOrderSoughtAt: day(30) };
    expect(holdActive(sought, day(200))).toBeTrue();
    expect(holdActive({ ...sought, refusedAt: day(90) }, day(91))).toBeFalse();
    expect(holdActive({ ...sought, endsAt: day(120) }, day(121))).toBeFalse();
    expect(holdActive({ ...sought, releasedAt: day(10) }, day(11))).toBeFalse();
  });
});
