import { z } from "zod";
import type { Municipality, Visibility } from "./types";

/**
 * Moderation (DECISIONS round 5, round 18 Q19 and Q31): an automatic pre-screen flags what a person
 * should look at, and volunteer moderators decide. The pre-screen never decides alone; it only holds
 * publication until someone has looked.
 */

export type ModerationFlag = "cpf" | "phone" | "insult" | "name" | "person" | "electoral";

export const FLAG_LABEL: Record<ModerationFlag, string> = {
  cpf: "CPF",
  phone: "Telefone",
  insult: "Ofensa",
  name: "Nome de pessoa",
  person: "Expõe uma pessoa",
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
/** Whether these words carry one of the strong insults (accents and case ignored). */
export function hasInsult(text: string): boolean {
  const p = ` ${plain(text).replace(/[^a-z0-9]+/g, " ")} `;
  return INSULTS.some((w) => p.includes(` ${w} `));
}

/** A title before a capitalised word: "vereador Fulano", "dona Maria". The scoreboard names bodies, never people. */
const NAME =
  /\b(?:sr|sra|seu|dona|dr|dra|vereador|vereadora|prefeito|prefeita|secretario|secretaria|deputado|deputada|senador|senadora|governador|governadora)\.?\s+(?:[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+)/;
/**
 * Pointing at one person without naming them (round 19): a neighbour in the singular, someone tied to
 * a house, a number or a car, or a licence plate. A house number alone stays allowed: "em frente ao
 * 145" is how people say where a pothole is. Matched on plain text (lower case, no accents).
 */
const NEIGHBOUR = /\b(?:o|a|meu|minha|esse|essa|este|esta|aquele|aquela|do|da|pro|pra)\s+vizinh[oa]\b/;
const PERSON = String.raw`(?:morador|moradora|dono|dona|proprietari[oa]|inquilin[oa]|vizinh[oa]|cara|homem|mulher|senhor|senhora|velho|velha|guri|guria|sujeito)`;
const COLOUR = String.raw`(?:prata|preto|preta|branco|branca|vermelho|vermelha|azul|cinza|verde|amarelo|amarela|bege|marrom)`;
const PERSON_AT = new RegExp(
  String.raw`\b${PERSON}\s+(?:que mora\s+)?(?:d[oa]s?|n[oa])\s+(?:\d|(?:casa|numero|n|apartamento|apto|ap|predio|terreno|lote|carro|moto|caminhao|caminhonete)\b|\w+\s+${COLOUR}\b)`,
);
/** Mercosul (ABC1D23) and the older grey plates (ABC-1234). */
const PLATE = /\b[a-z]{3}-?\d[a-z0-9]\d{2}\b/i;

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
  if (hasInsult(text)) flags.add("insult");
  if (NAME.test(text)) flags.add("name");
  const words = p.trim();
  if (NEIGHBOUR.test(words) || PERSON_AT.test(words) || PLATE.test(text)) flags.add("person");
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
  if (flags.includes("person"))
    return "Tire o que aponta para uma pessoa (vizinho, casa, carro ou placa): o Fala fala da cidade, não de pessoas.";
  return "Tire a ofensa do texto e envie de novo.";
}

/* ---------- Reports ("Denunciar") on pins, photos and updates ---------- */

/** What a report points at: the whole pin, one of its photos, or one update in its history. */
export type ReportTarget = "item" | "photo" | "update";

/** Why someone reports. The first two are about photos that must never stay up while someone decides. */
export const ReportReasonSchema = z.enum(["sexual", "child", "person", "offense", "spam", "other"]);
export type ReportReason = z.infer<typeof ReportReasonSchema>;

export const REPORT_REASON: Record<ReportReason, { label: string; hint: string }> = {
  sexual: { label: "Nudez ou conteúdo sexual", hint: "Qualquer imagem íntima ou obscena." },
  child: { label: "Mostra uma criança", hint: "Rosto ou corpo de uma criança ou adolescente." },
  person: { label: "Expõe uma pessoa", hint: "Nome, rosto, casa, placa ou outro dado de alguém." },
  offense: { label: "Ofensa, ameaça ou preconceito", hint: "Contra uma pessoa ou um grupo." },
  spam: { label: "Não é um problema da cidade", hint: "Propaganda, spam, briga entre vizinhos." },
  other: { label: "Outro motivo", hint: "Conte em poucas palavras." },
};

/** Reasons that take a photo down at once (hide first): the harm of leaving it up outweighs a wrong report. */
const URGENT: ReadonlySet<ReportReason> = new Set(["sexual", "child"]);

/**
 * Whether a report takes the thing down before anyone looks. Only a photo, only for nudity or a
 * child, and from anyone who got this far (a neighbour at nível 1, or a visitor past the robot check):
 * the person shown may have no account, and the law expects intimate images down promptly once
 * they're notified (Marco Civil art. 21; round 19). Never from a muted account, and never again once
 * a moderator looked at a report on that photo and kept it. Everything else waits in the queue.
 */
export function hidesAtOnce(r: {
  target: ReportTarget;
  reason: ReportReason;
  muted: boolean;
  keptBefore: boolean;
}): boolean {
  return r.target === "photo" && URGENT.has(r.reason) && !r.muted && !r.keptBefore;
}

/**
 * From this nudity score on (the screening service's, round 20), the queue treats a photo as likely
 * nude: it goes first, and the moderator sees it blurred until they choose to look.
 */
export const LIKELY_NUDE = 0.45;

/** Whether a moderator should see this case's images blurred until they choose to look. */
export const shieldsModerator = (reasons: readonly ReportReason[]) => reasons.some((r) => URGENT.has(r));
