import { isReadableCode } from "./signup";

/**
 * Reading the Prefeitura's answer to a resumo (DECISIONS round 5; research/digest-pdf/receivers.md,
 * item 9): the resumo asks for a protocol per report, citing its code, or one protocol for the whole
 * resumo. How the Ouvidoria and the CAC actually answer is still unknown (research/canoas, the pilot
 * e-mail), so this reads only what it can place, and says what it couldn't: the service applies the
 * clear part and leaves the rest to a person. Plain functions over text: the service does the e-mail.
 */

export type ProtocolKind = "nup" | "protocolo" | "memorando" | "oficio";

export interface ProtocolReading {
  /** The reports' codes it covers, or "all": one protocol for the whole resumo, no codes named. */
  codes: string[] | "all";
  number: string;
  kind: ProtocolKind;
}

export interface ReplyReading {
  readings: ProtocolReading[];
  /** Protocol numbers that couldn't be tied to reports. */
  unclear: string[];
  /** The resumo's codes mentioned without a protocol: a person should read what was said about them. */
  loose: string[];
  /** The reply asks for more information (a pedido de complementação suspends the legal deadline). */
  asksMore: boolean;
}

/**
 * The reply without the message it answers: the quoted resumo carries every code, and the example in
 * its request, so it must never be read as the answer. Cuts at the usual reply headers (Gmail in
 * Portuguese and English, Outlook) and drops ">"-quoted lines.
 */
export function replyBody(text: string): string {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const next = `${line} ${lines[i + 1] ?? ""}`;
    if (/^\s*-{2,}\s*(mensagem original|original message|mensagem encaminhada|forwarded message)/i.test(line)) break;
    // Gmail wraps "Em seg., 13 de out. de 2026 às 18:00, Fala <…>\nescreveu:" over two lines.
    if (
      /^\s*(em|on)\s.+\b(escreveu|wrote)\s*:\s*$/i.test(line) ||
      /^\s*(em|on)\s.+\b(escreveu|wrote)\s*:\s*$/i.test(next)
    )
      break;
    if (/^\s*(de|from)\s*:/i.test(line) && /^\s*(enviad[ao]|data|sent|date)\s*:/i.test(lines[i + 1] ?? "")) break;
    if (/^\s*>/.test(line)) continue;
    out.push(line);
  }
  return out.join("\n").trim();
}

const NUP = /\b\d{5}\.\d{6}\/\d{4}-\d{2}\b/g;
/**
 * "Protocolo nº 2026/012345", "protocolo geral: 123456", "NUP 00106…", "Memorando nº 145/2026-SMSU",
 * "Ofício 32/2026". The number needs three digits at least, and isn't all zeros (the resumo's example).
 */
const LABELLED =
  /\b(protocolos?|protocolado|nup|memorandos?|memo|of[ií]cios?)\b(?:\s+(?:geral|sob|o|de|do|atendimento|n[uú]mero|n[º°o]\.?|registrad[ao]|gerad[ao]))*\s*[:#-]?\s*(?:n[º°o]\.?\s*)?([a-z0-9][a-z0-9./-]*)/gi;

const kindOf = (label: string): ProtocolKind => {
  const l = label.toLowerCase();
  if (l === "nup") return "nup";
  if (l.startsWith("memo")) return "memorando";
  if (l.startsWith("of")) return "oficio";
  return "protocolo";
};

/** Three digits at least, and not the resumo's example (zeros, with or without the year). */
const plausible = (number: string) => {
  const digits = number.replace(/\D/g, "");
  return digits.length >= 3 && !/^0*$/.test(digits.replace(/^20\d\d|20\d\d$/, ""));
};

/** "2026/004512" → "9/9": a second number of the same shape follows a plural label ("protocolos A e B"). */
const shape = (number: string) => number.replace(/\d+/g, "9").replace(/[a-z]+/gi, "a");
const NUMBERISH = /\b\d[\d./-]*\d(?:-[a-z]+)?\b/gi;
const DATE = /^\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}$/;

function numbersIn(line: string): { number: string; kind: ProtocolKind }[] {
  const found = new Map<string, ProtocolKind>();
  for (const m of line.matchAll(NUP)) found.set(m[0], "nup");
  for (const m of line.matchAll(LABELLED)) {
    const number = (m[2] ?? "").replace(/[./-]+$/, "").toUpperCase();
    // A NUP already found is met again through its label.
    if (!plausible(number) || found.has(number)) continue;
    const kind = kindOf(m[1] ?? "");
    found.set(number, kind);
    if (!/s$/i.test(m[1] ?? "")) continue;
    for (const more of line.slice((m.index ?? 0) + m[0].length).matchAll(NUMBERISH)) {
      const n = more[0].toUpperCase();
      if (shape(n) === shape(number) && !DATE.test(n) && plausible(n) && !found.has(n)) found.set(n, kind);
    }
  }
  return [...found].map(([number, kind]) => ({ number, kind }));
}

const codesIn = (line: string, codes: Set<string>) => [
  ...new Set(
    [...line.matchAll(/\b[a-z0-9]{5}\b/gi)]
      .map((m) => m[0].toUpperCase())
      .filter((c) => isReadableCode(c) && codes.has(c)),
  ),
];

/**
 * The protocols in a reply's own text (replyBody), tied to the resumo's codes. A protocol and codes on
 * the same line go together (several of each pair up in order); codes on a line of their own go with
 * a protocol on the next one. A single protocol with no code anywhere covers the whole resumo.
 */
export function readProtocols(body: string, resumoCodes: string[]): ReplyReading {
  const codes = new Set(resumoCodes.map((c) => c.toUpperCase()));
  const readings: ProtocolReading[] = [];
  const unclear: string[] = [];
  const mentioned = new Set<string>();
  let waiting: string[] = [];
  for (const line of body.split("\n").map((l) => l.trim())) {
    if (!line) continue;
    const here = codesIn(line, codes);
    const numbers = numbersIn(line);
    for (const c of here) mentioned.add(c);
    if (here.length && numbers.length) {
      const [only] = numbers;
      if (numbers.length === 1 && only) readings.push({ codes: here, ...only });
      else if (numbers.length === here.length)
        numbers.forEach((n, i) => readings.push({ codes: [here[i] ?? ""], ...n }));
      else unclear.push(...numbers.map((n) => n.number));
      waiting = [];
    } else if (here.length) waiting = [...waiting, ...here];
    else if (numbers.length) {
      const [only] = numbers;
      if (waiting.length && numbers.length === 1 && only) readings.push({ codes: waiting, ...only });
      else unclear.push(...numbers.map((n) => n.number));
      waiting = [];
    } else waiting = [];
  }
  const distinct = [...new Set(unclear)];
  const [single] = distinct;
  if (!readings.length && !mentioned.size && distinct.length === 1 && single) {
    const kind = numbersIn(body).find((n) => n.number === single)?.kind ?? "protocolo";
    readings.push({ codes: "all", number: single, kind });
    distinct.length = 0;
  }
  const covered = new Set(readings.flatMap((r) => (r.codes === "all" ? [] : r.codes)));
  return {
    readings,
    unclear: distinct,
    loose: [...mentioned].filter((c) => !covered.has(c)),
    asksMore: /complementa[çc][ãa]o|complementar|mais informa[çc]|informa[çc][õo]es adicionais|esclarec/i.test(body),
  };
}

/** "Re: Fala, Canoas · Resumo diário nº 0012/2026 · …" → its number and year. */
export function resumoNumberIn(subject: string): { number: number; year: number } | null {
  const m = /resumo di[áa]rio n[º°o]\.?\s*(\d{1,5})\/(\d{4})/i.exec(subject);
  return m ? { number: Number(m[1]), year: Number(m[2]) } : null;
}

/** Whether the reply was read in full: nothing left that a person should look at. */
export const fullyRead = (r: ReplyReading) =>
  r.readings.length > 0 && !r.unclear.length && !r.loose.length && !r.asksMore;
