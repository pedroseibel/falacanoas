import { z } from "zod";

/** The landing page queue: people sign up per bairro and each bairro opens when its queue fills. */

export const SignupChannelSchema = z.enum(["whatsapp", "email"]);
export type SignupChannel = z.infer<typeof SignupChannelSchema>;

export const HelpSchema = z.enum(["moderar", "codigo", "divulgar"]);
export type Help = z.infer<typeof HelpSchema>;

const digits = (v: string) => v.replace(/\D/g, "");

/** Formats a Brazilian phone number while it is typed: (51) 99999-9999. */
export function maskPhoneBR(v: string): string {
  const d = digits(v).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** A pt-BR message for a contact that can't be right, or null when it looks fine. */
export function contactError(channel: SignupChannel, value: string): string | null {
  const v = value.trim();
  if (channel === "whatsapp") {
    const d = digits(v);
    if (d.length < 10)
      return d.length
        ? "Esse número parece incompleto. Use o DDD e o número, como (51) 99999-9999."
        : "Digite seu WhatsApp com DDD.";
    if (d.length === 11 && d.charAt(2) !== "9") return "Celulares têm 9 dígitos depois do DDD. Confira o número.";
    return null;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))
    return v ? "Esse e-mail parece ter um erro. Confira o que vem depois do @." : "Digite seu e-mail.";
  return null;
}

/** How a contact is stored: 55 + digits for WhatsApp, lower-case for e-mail. */
export const normalizeContact = (channel: SignupChannel, value: string) =>
  channel === "whatsapp" ? `55${digits(value)}` : value.trim().toLowerCase();

export const QueueSignupSchema = z
  .object({
    neighborhood: z.string().min(1, "Escolha um bairro para entrar na fila."),
    channel: SignupChannelSchema,
    contact: z.string(),
    help: z.array(HelpSchema).max(3),
    consent: z.boolean().refine((v) => v, "Para entrar na fila, confirme a idade e o aviso de privacidade."),
  })
  .superRefine((v, ctx) => {
    const message = contactError(v.channel, v.contact);
    if (message) ctx.addIssue({ code: "custom", path: ["contact"], message });
  });
export type QueueSignup = z.infer<typeof QueueSignupSchema>;

const CODE_ALPHABET = "ACDEFHJKMNPRTUVWXY3479";

/** Four characters the person sends back to confirm, without look-alikes (0/O, 1/I, 5/S…). */
export function confirmationCode(random: ArrayLike<number>): string {
  let s = "";
  for (let i = 0; i < 4; i++) s += CODE_ALPHABET.charAt((random[i] ?? 0) % CODE_ALPHABET.length);
  return s;
}

/** Sign-ups still missing for a bairro to open. Null threshold: it opens with the first bairro. */
export const missingSignups = (threshold: number | null, confirmed: number) =>
  threshold ? Math.max(0, threshold - confirmed) : 0;
