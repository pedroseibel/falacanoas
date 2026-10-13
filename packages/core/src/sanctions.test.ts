import { describe, expect, test } from "bun:test";
import {
  ACCOUNT_LIMITS,
  dueForMute,
  limitMessage,
  NEW_ACCOUNT_LIMITS,
  postingLimits,
  standing,
  standingMessage,
  weightOf,
  type SanctionState,
} from "./sanctions";

const now = new Date("2026-10-13T12:00:00-03:00");
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);
const strike = (d: number) => ({ weight: "strike" as const, at: daysAgo(d) });
const day = (d: Date) => d.toISOString().slice(0, 10);
const s = (over: Partial<SanctionState>): SanctionState => ({
  kind: "mute",
  startsAt: daysAgo(1),
  endsAt: daysAgo(-29),
  liftedAt: null,
  confirmed: true,
  ...over,
});

describe("removal weights", () => {
  test("honest mistakes weigh nothing; exposure and offence are strikes; nudity is grave", () => {
    expect(weightOf("Rosto ou placa legível.")).toBe("none");
    expect(weightOf("Mostra uma criança.")).toBe("none");
    expect(weightOf("Expõe uma pessoa.")).toBe("strike");
    expect(weightOf("Nudez ou conteúdo sexual.")).toBe("grave");
  });
  test("a reason typed by hand counts as a strike", () => {
    expect(weightOf("o texto ataca o vizinho")).toBe("strike");
  });
});

describe("dueForMute", () => {
  test("three strikes in 30 days mute; two don't; old ones fall out", () => {
    expect(dueForMute([strike(1), strike(5), strike(20)], now)).toBeTrue();
    expect(dueForMute([strike(1), strike(5)], now)).toBeFalse();
    expect(dueForMute([strike(1), strike(5), strike(40)], now)).toBeFalse();
  });
  test("one grave removal mutes at once; honest mistakes never do", () => {
    expect(dueForMute([{ weight: "grave", at: daysAgo(2) }], now)).toBeTrue();
    const none = { weight: "none" as const, at: daysAgo(1) };
    expect(dueForMute([none, none, none, none], now)).toBeFalse();
  });
});

describe("standing", () => {
  test("free to post with nothing in force", () => {
    expect(standing([], now)).toEqual({ kind: "ok" });
    expect(standing([s({ endsAt: daysAgo(1), startsAt: daysAgo(31) })], now)).toEqual({ kind: "ok" });
    expect(standing([s({ liftedAt: daysAgo(0.5) })], now)).toEqual({ kind: "ok" });
  });

  test("a suspension beats a mute, but only once confirmed", () => {
    expect(standing([s({}), s({ kind: "suspend", confirmed: false })], now).kind).toBe("mute");
    expect(standing([s({}), s({ kind: "suspend" })], now).kind).toBe("suspend");
  });

  test("the longest of a kind wins; a permanent one has no end", () => {
    const later = daysAgo(-60);
    expect(standing([s({}), s({ endsAt: later })], now)).toEqual({ kind: "mute", until: later });
    expect(standing([s({ kind: "suspend", endsAt: null })], now)).toEqual({ kind: "suspend", until: null });
  });

  test("the person is told what it means, and where to contest", () => {
    expect(standingMessage({ kind: "mute", until: daysAgo(-29) }, day)).toContain("silenciada até");
    expect(standingMessage({ kind: "suspend", until: null }, day)).toBe(
      "Sua conta está suspensa. Você pode ler tudo; o motivo e como contestar estão em Você.",
    );
  });
});

test("new accounts get far less room for 72 hours", () => {
  expect(postingLimits(null, now)).toEqual(NEW_ACCOUNT_LIMITS);
  expect(postingLimits(new Date(now.getTime() - 71 * 3_600_000), now)).toEqual(NEW_ACCOUNT_LIMITS);
  expect(postingLimits(new Date(now.getTime() - 72 * 3_600_000), now)).toEqual(ACCOUNT_LIMITS);
});

test("limit messages say what the limit is, and why it's lower for new accounts", () => {
  expect(limitMessage("pins", NEW_ACCOUNT_LIMITS)).toBe(
    "Nos primeiros 3 dias, uma conta nova envia até 3 registros por dia. Tente de novo amanhã.",
  );
  expect(limitMessage("photos", ACCOUNT_LIMITS)).toBe(
    "Você chegou a 40 fotos hoje, o limite diário. Tente de novo amanhã.",
  );
});
