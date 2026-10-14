import { expect, test } from "bun:test";
import { RESOLVED_VOTES_TO_CLOSE } from "@fala/core";
import { EXAMPLE, LOOP, PHASE_STARTS, readout, STILL_AT, stateAt, TOUR } from "./relief-model";

test("the tour is one pin's life, in order, and loops", () => {
  const phases = PHASE_STARTS.map((t) => stateAt(t + 0.01).phase);
  expect(phases).toEqual(["registrar", "enviar", "contar", "confirmar", "resolvido"]);
  expect(stateAt(LOOP + 0.01).phase).toBe("registrar");
});

test("nothing counts before the 18h resumo; it counts up to the day neighbours confirmed", () => {
  expect(stateAt(0.5).days).toBe(0);
  expect(stateAt(TOUR.registrar + 0.2).sent).toBeFalse();
  expect(stateAt(TOUR.registrar + TOUR.enviar - 0.05).sent).toBeTrue();
  expect(stateAt(TOUR.registrar + TOUR.enviar + TOUR.contar - 0.001).days).toBeCloseTo(EXAMPLE.fixedOnDay, 0);
});

test("it closes with the rule's number of neighbours, then sinks", () => {
  const done = stateAt(LOOP - 0.01);
  expect(done.votes).toBe(RESOLVED_VOTES_TO_CLOSE);
  expect(done.sink).toBe(1);
  expect(readout(done, 30)).toBe(`${EXAMPLE.code} · ${EXAMPLE.bairro} · resolvido em 43 dias`);
});

test("the still moment, for reduced motion, reads past the deadline", () => {
  expect(readout(stateAt(STILL_AT), 30)).toMatch(/dias em aberto, acima de 30$/);
});
