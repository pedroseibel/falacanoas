import { maskedPhone } from "@fala/core";
import type { Outbox } from "./gateway";

/**
 * Where codes go. No WhatsApp or SMS provider is connected yet (research/BUILD.md, 3.2): in
 * development the code waits here for the sign-in page's "Ver código"; in production sending fails,
 * and the page says the code couldn't be sent.
 */
const devCodes = new Map<string, string>();

export function outbox(development: boolean): Outbox {
  return {
    async deliver(phone, code) {
      if (!development) throw new Error("Nenhum provedor de WhatsApp ou SMS configurado.");
      devCodes.set(phone, code);
      console.info(`[dev] código de entrada para ${maskedPhone(phone)}: ${code}`);
    },
  };
}

/** The last code sent to this phone, development only. */
export const peekDevCode = (phone: string) => devCodes.get(phone) ?? null;
