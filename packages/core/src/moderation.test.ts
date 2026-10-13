import { describe, expect, test } from "bun:test";
import {
  hidesAtOnce,
  holdsPublication,
  inElection,
  isValidCpf,
  prescreen,
  refusedInUpdates,
  ReportReasonSchema,
  shieldsModerator,
} from "./moderation";

const off = { electoral: false };

describe("prescreen", () => {
  test("a CPF only when its check digits hold", () => {
    expect(isValidCpf("529.982.247-25")).toBeTrue();
    expect(isValidCpf("111.111.111-11")).toBeFalse();
    expect(prescreen("Meu CPF é 529.982.247-25, me liguem", off)).toContain("cpf");
    expect(prescreen("Protocolo 123.456.789-00", off)).not.toContain("cpf");
  });

  test("phone numbers, but not protocols or years", () => {
    expect(prescreen("liguem para (51) 99123-4567", off)).toContain("phone");
    expect(prescreen("fone 3477 1234", off)).toContain("phone");
    expect(prescreen("Protocolo 2026/018734, aberto em 2026", off)).not.toContain("phone");
    expect(prescreen("Faz 43 dias", off)).toEqual([]);
  });

  test("strong insults, not civic anger", () => {
    expect(prescreen("Esse vizinho é um idiota", off)).toContain("insult");
    expect(prescreen("Que descaso, um absurdo", off)).toEqual([]);
  });

  test("a title before a name, since the Placar names bodies, never people", () => {
    expect(prescreen("O vereador Fulano prometeu e não fez", off)).toContain("name");
    expect(prescreen("A Secretaria de Obras não respondeu", off)).toEqual([]);
  });

  test("electoral wording only during a campaign", () => {
    expect(prescreen("Votem no candidato 45", { electoral: true })).toContain("electoral");
    expect(prescreen("Votem no candidato 45", off)).not.toContain("electoral");
  });
});

describe("what holds publication", () => {
  test("personal data, insults and names hold; signed politics doesn't", () => {
    expect(holdsPublication(["phone"], "pseudonymous")).toBeTrue();
    expect(holdsPublication(["electoral"], "pseudonymous")).toBeFalse();
    expect(holdsPublication(["electoral"], "anonymous")).toBeTrue();
    expect(holdsPublication([], "anonymous")).toBeFalse();
  });

  test("updates refuse personal data outright", () => {
    expect(refusedInUpdates(["cpf", "insult", "electoral"])).toEqual(["cpf", "insult"]);
  });

  test("Canoas's 2026 campaign, inclusive of both ends", () => {
    const muni = { electionPeriods: [{ from: "2026-08-16", to: "2026-10-25" }] };
    expect(inElection(muni, new Date("2026-08-16T00:30:00-03:00"))).toBeTrue();
    expect(inElection(muni, new Date("2026-10-25T23:00:00-03:00"))).toBeTrue();
    expect(inElection(muni, new Date("2026-10-26T00:30:00-03:00"))).toBeFalse();
    expect(inElection({}, new Date())).toBeFalse();
  });
});

describe("reports", () => {
  const photo = { target: "photo" as const, member: true, keptBefore: false };

  test("a member's report of nudity or a child takes a photo down at once", () => {
    expect(hidesAtOnce({ ...photo, reason: "sexual" })).toBeTrue();
    expect(hidesAtOnce({ ...photo, reason: "child" })).toBeTrue();
  });

  test("other reasons, other targets and visitors wait for a moderator", () => {
    expect(hidesAtOnce({ ...photo, reason: "person" })).toBeFalse();
    expect(hidesAtOnce({ ...photo, reason: "spam" })).toBeFalse();
    expect(hidesAtOnce({ ...photo, target: "update", reason: "sexual" })).toBeFalse();
    expect(hidesAtOnce({ ...photo, target: "item", reason: "child" })).toBeFalse();
    expect(hidesAtOnce({ ...photo, member: false, reason: "sexual" })).toBeFalse();
  });

  test("once a moderator kept a photo, reports no longer take it down by themselves", () => {
    expect(hidesAtOnce({ ...photo, keptBefore: true, reason: "sexual" })).toBeFalse();
  });

  test("moderators see nudity and children blurred first", () => {
    expect(shieldsModerator(["spam", "child"])).toBeTrue();
    expect(shieldsModerator(["person", "offense"])).toBeFalse();
    expect(shieldsModerator([])).toBeFalse();
  });

  test("only the known reasons parse", () => {
    expect(ReportReasonSchema.safeParse("sexual").success).toBeTrue();
    expect(ReportReasonSchema.safeParse("feio").success).toBeFalse();
  });
});
