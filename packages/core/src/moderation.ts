import type { Municipality, Visibility } from "./types";

/**
 * Moderation (DECISIONS round 5, round 18 Q19 and Q31): an automatic pre-screen flags what a person
 * should look at, and volunteer moderators decide. The pre-screen never decides alone; it only holds
 * publication until someone has looked.
 */

export type ModerationFlag = "cpf" | "phone" | "insult" | "name" | "electoral";

export const FLAG_LABEL: Record<ModerationFlag, string> = {
  cpf: "CPF",
  phone: "Telefone",
  insult: "Ofensa",
  name: "Nome de pessoa",
  electoral: "Propaganda eleitoral",
};

const plain = (s: string) => s.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();

/** A CPF's two check digits hold (so "123.456.789-00" typed by chance doesn't count). */
export function isValidCpf(value: string): boolean {
  const d = value.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digit = (n: number) => {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += Number(d[i]) * (n + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return digit(9) === Number(d[9]) && digit(10) === Number(d[10]);
}

const CPF = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
/** A Brazilian phone: optional DDD, then 8 or 9 digits in a phone's grouping. Protocols (with "/") don't match. */
const PHONE = /(?<![\d/])(?:\(?\d{2}\)?[\s.-]?)?9?\d{4}[\s.-]?\d{4}(?![\d/])/g;
/** Strong insults only; civic anger ("descaso", "absurdo") is not an insult. */
const INSULTS = [
  "idiota",
  "imbecil",
  "otario",
  "vagabundo",
  "vagabunda",
  "canalha",
  "safado",
  "safada",
  "desgracado",
  "desgracada",
  "filho da puta",
  "fdp",
  "corno",
  "arrombado",
  "puta",
  "viado",
];
/** A title before a capitalised word: "vereador Fulano", "dona Maria". The scoreboard names bodies, never people. */
const NAME =
  /\b(?:sr|sra|seu|dona|dr|dra|vereador|vereadora|prefeito|prefeita|secretario|secretaria|deputado|deputada|senador|senadora|governador|governadora)\.?\s+(?:[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+)/;
const ELECTORAL = /\b(?:vote|votem|votar em|vote em|eleja|elejam|candidat[oa]s?|numero \d{2,5}|reeleicao|reeleger)\b/;

/** Inside one of the instance's campaign periods (round 18, Q31: 2026 included). */
export function inElection(muni: Pick<Municipality, "electionPeriods">, now: Date): boolean {
  return (muni.electionPeriods ?? []).some(
    (p) => now >= new Date(`${p.from}T00:00:00-03:00`) && now <= new Date(`${p.to}T23:59:59-03:00`),
  );
}

/** What a person should look at in this text. Electoral wording counts only during a campaign. */
export function prescreen(text: string, opts: { electoral: boolean }): ModerationFlag[] {
  const flags = new Set<ModerationFlag>();
  if ([...text.matchAll(CPF)].some((m) => isValidCpf(m[0]))) flags.add("cpf");
  const withoutCpf = text.replace(CPF, " ");
  if ([...withoutCpf.matchAll(PHONE)].some((m) => m[0].replace(/\D/g, "").length >= 8)) flags.add("phone");
  const p = ` ${plain(text).replace(/[^a-z0-9]+/g, " ")} `;
  if (INSULTS.some((w) => p.includes(` ${w} `))) flags.add("insult");
  if (NAME.test(text)) flags.add("name");
  if (opts.electoral && ELECTORAL.test(plain(text))) flags.add("electoral");
  return [...flags];
}

/**
 * Whether these flags hold publication until a moderator decides. Personal data, insults and named
 * people do. Electoral propaganda is held only when it would go out as "Anônimo em público": signed
 * political content is allowed (round 5), anonymous propaganda is not (Q31).
 */
export function holdsPublication(flags: ModerationFlag[], visibility: Visibility): boolean {
  return flags.some((f) => f !== "electoral" || visibility === "anonymous");
}

/**
 * An update goes out at once, signed with the apelido, with no one looking first: whatever would hold
 * a report is refused instead, and the person is asked to take it out. Signed politics stays allowed.
 */
export const refusedInUpdates = (flags: ModerationFlag[]) => flags.filter((f) => f !== "electoral");

/** The sentence that asks someone to take the flagged part out. */
export function refusalFor(flags: ModerationFlag[]): string {
  if (flags.includes("cpf") || flags.includes("phone"))
    return "Tire o CPF ou o telefone do texto: dados pessoais não aparecem no Fala.";
  if (flags.includes("name")) return "Tire o nome da pessoa: o Fala fala de órgãos públicos, não de pessoas.";
  return "Tire a ofensa do texto e envie de novo.";
}
