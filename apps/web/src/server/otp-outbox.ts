import { maskedPhone } from "@fala/core";

/**
 * Where sign-in codes go. No WhatsApp or SMS provider is connected yet, so in development the code
 * is kept here (and logged) for the sign-in dialog to show; in production sending fails loudly.
 */
const outbox = new Map<string, string>();

export function deliverCode(phone: string, code: string) {
  if (!import.meta.env.DEV) throw new Error("Nenhum provedor de WhatsApp ou SMS configurado.");
  outbox.set(phone, code);
  console.info(`[dev] código de entrada para ${maskedPhone(phone)}: ${code}`);
}

/** The last code sent to this phone, development only. */
export const peekDevCode = (phone: string) => (import.meta.env.DEV ? (outbox.get(phone) ?? null) : null);
