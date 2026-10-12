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
