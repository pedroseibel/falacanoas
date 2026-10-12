import { z } from "zod";

/** Accounts: a phone to sign in (never shown), a public apelido, a bairro. See research/DECISIONS.md, rounds 2 and 15. */

/** A Brazilian number as typed ("(51) 99999-8888", "51999998888", "+55 51 …") in E.164, or null. */
export function toE164BR(value: string): string | null {
  let d = value.replace(/\D/g, "");
  if (d.length === 13 && d.startsWith("55")) d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) return null;
  if (d.length === 11 && d.charAt(2) !== "9") return null;
  if (d.startsWith("0")) return null;
  return `+55${d}`;
}

/** Sign-in codes go to WhatsApp or SMS, so only mobiles: +55, area code, 9 and eight digits. */
export const isBrazilianMobileE164 = (v: string) => /^\+55[1-9]{2}9\d{8}$/.test(v);

/** The Turnstile action the sign-in page declares; the vault refuses a token minted for another one. */
export const SEND_CODE_ACTION = "enviar-codigo";
/** The Turnstile action of a guest pin (round 2): a token minted for sign-in can't post one, and back. */
export const GUEST_PIN_ACTION = "registro-convidado";

/** "+5551999998888" → "(51) 9…8888": enough to recognise your own number, nothing more. */
export const maskedPhone = (e164: string) => {
  const d = e164.replace(/^\+55/, "");
  return `(${d.slice(0, 2)}) ${d.slice(2, 3)}…${d.slice(-4)}`;
};

/**
 * The public apelido: lower case, words joined by hyphens, accents allowed. No long digit runs,
 * so a phone number or CPF can't become someone's name.
 */
export const NickSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Use pelo menos 3 letras.")
  .max(28, "Use no máximo 28 caracteres.")
  .regex(/^[a-zà-öø-ÿ0-9]+(?:-[a-zà-öø-ÿ0-9]+)*$/, "Use letras, números e hífens, como garça-do-sinos.")
  .refine((v) => !/\d{4,}/.test(v), "Evite sequências de números no apelido.");

const BIRDS = [
  "garça",
  "biguá",
  "quero-quero",
  "sabiá",
  "bem-te-vi",
  "joão-de-barro",
  "tico-tico",
  "corruíra",
  "socó",
  "martim",
];
const PLACES = [
  "do-sinos",
  "da-praça",
  "do-parque",
  "da-esquina",
  "da-parada",
  "do-arroio",
  "da-figueira",
  "do-ipê",
  "da-várzea",
  "do-banhado",
];

/** Apelido suggestions in the voice of the place: birds of the Sinos delta and bits of the bairro. */
export function suggestNicks(random: () => number = Math.random, count = 3): string[] {
  const out = new Set<string>();
  while (out.size < count) {
    const bird = BIRDS[Math.floor(random() * BIRDS.length)] ?? "garça";
    const place = PLACES[Math.floor(random() * PLACES.length)] ?? "do-sinos";
    out.add(`${bird}-${place}`);
  }
  return [...out];
}

/** Two letters for an avatar: "garça-do-sinos" → "GS" (short joining words are skipped). */
export const initials = (nick: string) =>
  nick
    .split(/[-\s]+/)
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase();

/* ---------- Apelido reservation (DECISIONS round 18, Q28) ---------- */

const LOOKALIKES: Record<string, string> = {
  "0": "o",
  "1": "i",
  l: "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
};

/**
 * The key two apelidos collide on: accents, hyphens and look-alike characters removed, so
 * "garça-do-sinos", "garca-d0-sinos" and "garcadosinos" are one name.
 */
export const nickKey = (nick: string) =>
  nick
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/[01345l78]/g, (c) => LOOKALIKES[c] ?? c);

export interface NickReservation {
  /** The account holding it now, or null once released. */
  ownerId: string | null;
  /** Who held it last (a released name can go back to them). */
  lastOwnerId: string;
  /** It signed a public contribution, so it is never given to anyone else. */
  published: boolean;
  /** When it was released (ms), or null while held. */
  releasedAt: number | null;
}

/** Days a released apelido that never signed anything stays held before anyone else can take it. */
export const NICK_HOLD_DAYS = 90;

/** Can this account take an apelido whose key has this reservation? */
export function nickAvailable(r: NickReservation | undefined, accountId: string, now: number): boolean {
  if (!r || r.ownerId === accountId) return true;
  if (r.ownerId) return false;
  if (r.lastOwnerId === accountId) return true;
  if (r.published || r.releasedAt === null) return false;
  return now - r.releasedAt >= NICK_HOLD_DAYS * 864e5;
}
