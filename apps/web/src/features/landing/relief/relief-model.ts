import { RESOLVED_VOTES_TO_CLOSE } from "@fala/core";

/**
 * The landing's relief of Canoas (Anatomy figure): one pin's life, performed on the city's own map.
 * Every number the figure shows comes from here, and here from the product's rules: the resumo goes
 * at 18h and starts the clock, a pin stacks one disc per day open, the reference deadline is the
 * instance's (Lei 13.460/2017, art. 16), and the pin closes when RESOLVED_VOTES_TO_CLOSE neighbours
 * say it was fixed. The pin is an example from the fixtures, and the figure says so.
 */

export const SEND_HOUR = 18;
/** The example pin (fixtures): its code, bairro, the time it was registered and the day it was fixed. */
export const EXAMPLE: { code: string; bairro: string; registeredAt: number; fixedOnDay: number } = {
  code: "7K3QF",
  bairro: "Niterói",
  registeredAt: 14 * 60 + 20,
  fixedOnDay: 43,
};
export const VOTES = RESOLVED_VOTES_TO_CLOSE;

export type Phase = "registrar" | "enviar" | "contar" | "confirmar" | "resolvido";

export interface ReliefState {
  phase: Phase;
  /** The pin landing on the map: 0 above it, 1 seated. */
  drop: number;
  /** The 18h resumo has carried it: the clock runs. */
  sent: boolean;
  /** Days open, continuous; the stack shows them as height. */
  days: number;
  /** Neighbours who said it was fixed. */
  votes: number;
  /** The closed stack sinking into a resolved ring: 0 standing, 1 gone. */
  sink: number;
}

/** Seconds each part of the tour takes; the loop is their sum. */
export const TOUR: Record<Phase, number> = { registrar: 1.4, enviar: 1.8, contar: 7.6, confirmar: 2.6, resolvido: 3.2 };
export const LOOP = Object.values(TOUR).reduce((a, b) => a + b, 0);
const PHASES: Phase[] = ["registrar", "enviar", "contar", "confirmar", "resolvido"];

const ease = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
};

/** The relief at `t` seconds into the loop. */
export function stateAt(t: number): ReliefState {
  let at = ((t % LOOP) + LOOP) % LOOP;
  let phase: Phase = "registrar";
  for (const p of PHASES) {
    phase = p;
    if (at < TOUR[p]) break;
    at -= TOUR[p];
  }
  const share = Math.min(1, at / TOUR[phase]);
  const base: ReliefState = { phase, drop: 1, sent: true, days: EXAMPLE.fixedOnDay, votes: 0, sink: 0 };
  switch (phase) {
    case "registrar":
      return { ...base, drop: ease(share / 0.7), sent: false, days: 0 };
    case "enviar":
      return { ...base, sent: share >= 0.6, days: 0 };
    case "contar":
      return { ...base, days: EXAMPLE.fixedOnDay * ease(share) };
    case "confirmar":
      return { ...base, votes: share < 0.3 ? 0 : share < 0.7 ? Math.min(1, VOTES) : VOTES };
    case "resolvido":
      return { ...base, votes: VOTES, sink: ease(share / 0.45) };
  }
  return base;
}

/** A still moment for reduced motion: the clock past the deadline, nobody has confirmed yet. */
export const STILL_AT = TOUR.registrar + TOUR.enviar + TOUR.contar * 0.95;

export const clockText = (minutes: number) => {
  const m = Math.round(minutes) % (24 * 60);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
};

const plural = (n: number) => (n === 1 ? "1 dia" : `${n} dias`);

/** The figure's live readout, in the product's words. */
export function readout(s: ReliefState, deadline: number): string {
  const days = Math.floor(s.days);
  const head = `${EXAMPLE.code} · ${EXAMPLE.bairro}`;
  switch (s.phase) {
    case "registrar":
      return `${head} · registrado às ${clockText(EXAMPLE.registeredAt)}`;
    case "enviar":
      return s.sent
        ? `${head} · enviado às ${SEND_HOUR}h, o relógio começa`
        : `${head} · vai no resumo das ${SEND_HOUR}h`;
    case "contar":
      return days > deadline
        ? `${head} · ${plural(days)} em aberto, acima de ${deadline}`
        : `${head} · ${plural(days)} em aberto`;
    case "confirmar":
      return `${head} · ${plural(days)} · ${s.votes} de ${VOTES} vizinhos viram o conserto`;
    case "resolvido":
      return `${head} · resolvido em ${plural(days)}`;
  }
  return head;
}

/** The start of each part of the tour, for keyboard steps. */
export const PHASE_STARTS = PHASES.map((p) => PHASES.slice(0, PHASES.indexOf(p)).reduce((a, q) => a + TOUR[q], 0));
