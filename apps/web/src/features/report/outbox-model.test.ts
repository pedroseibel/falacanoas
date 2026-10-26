import { expect, test } from "bun:test";
import { afterFailure, due, DraftSchema, nextTry, outboxLine, retryDelay, type Draft } from "./outbox-model";

const draft = (over: Partial<Draft> = {}): Draft => ({
  key: crypto.randomUUID(),
  fields: {
    kind: "occurrence",
    category: "buraco",
    title: "",
    reach: "place",
    place: "",
    neighborhood: "",
    reference: "",
    flooding: {},
    location: [-51.18, -29.91],
    text: "",
    visibility: "pseudonymous",
  },
  photos: [new Blob([new Uint8Array([1, 2, 3])], { type: "image/webp" })],
  createdAt: 1_000,
  attempts: 0,
  nextAt: 1_000,
  refused: null,
  ...over,
});

test("tries again after 10 s, then backs off to 15 minutes", () => {
  expect([1, 2, 3, 4, 5, 6, 7, 20].map(retryDelay)).toEqual([
    10_000, 30_000, 60_000, 120_000, 300_000, 900_000, 900_000, 900_000,
  ]);
  const d = afterFailure(draft(), 5_000);
  expect(d).toMatchObject({ attempts: 1, nextAt: 15_000 });
  expect(afterFailure(d, 20_000)).toMatchObject({ attempts: 2, nextAt: 50_000 });
});

test("only what's due goes, oldest first; refused reports wait for the person", () => {
  const a = draft({ createdAt: 3, nextAt: 10 });
  const b = draft({ createdAt: 1, nextAt: 5 });
  const later = draft({ nextAt: 99 });
  const refused = draft({ nextAt: 0, refused: "Use no máximo 280 caracteres." });
  expect(due([a, later, refused, b], 10).map((d) => d.key)).toEqual([b.key, a.key]);
  expect(nextTry([later, refused])).toBe(99);
  expect(nextTry([refused])).toBeNull();
});

test("what the person reads; nothing about a report still in the form's own send", () => {
  expect(outboxLine([], 1_000)).toBeNull();
  expect(outboxLine([draft({ nextAt: 9_000 })], 1_000)).toBeNull();
  expect(outboxLine([draft()], 1_000)?.text).toBe(
    "1 registro guardado neste celular. Ele vai ser enviado quando a conexão voltar.",
  );
  expect(outboxLine([draft(), draft({ attempts: 1, nextAt: 9_000 })], 1_000)?.text).toContain("2 registros guardados");
  const refused = draft({ refused: "Hoje você já publicou 10 registros." });
  expect(outboxLine([draft(), refused], 1_000)).toEqual({
    text: "Não deu para publicar um registro guardado: Hoje você já publicou 10 registros.",
    refused,
  });
});

test("what comes back from storage is checked, not trusted", () => {
  expect(DraftSchema.safeParse(draft()).success).toBeTrue();
  expect(DraftSchema.safeParse({ ...draft(), key: "x" }).success).toBeFalse();
  expect(DraftSchema.safeParse({ ...draft(), photos: ["não é foto"] }).success).toBeFalse();
});
