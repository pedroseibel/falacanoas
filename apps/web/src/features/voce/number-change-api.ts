import { z } from "zod";

/**
 * The browser's side of changing number (DECISIONS round 18, Q20): the ticket from the app and the
 * new number go straight to the vault (/api/identidade/troca/*), never through the app.
 */

export type ChangeFailure = "invalid" | "expired" | "same" | "taken" | "rate" | "send";

const FailureSchema = z.object({ error: z.enum(["invalid", "expired", "same", "taken", "rate", "send"]) });

/** What went wrong, from the vault's answer; anything unreadable counts as not sent. */
export const changeFailure = (body: unknown): ChangeFailure => FailureSchema.safeParse(body).data?.error ?? "send";

const CHANGE_FAILURE_MESSAGE: Record<ChangeFailure, string> = {
  invalid: "Confira: use um celular com DDD, como (51) 99999-9999, e o código de 6 números.",
  expired: "O tempo para trocar acabou. Feche e comece de novo.",
  same: "Esse já é o número da sua conta.",
  taken: "Esse número já tem uma conta no Fala. Para usá-lo aqui, encerre aquela conta antes.",
  rate: "Muitos códigos em pouco tempo. Espere 15 minutos e tente de novo.",
  send: "Não deu para mandar o código agora. Tente de novo em alguns minutos.",
};

class ChangeError extends Error {
  constructor(readonly failure: ChangeFailure) {
    super(CHANGE_FAILURE_MESSAGE[failure]);
  }
}

async function post(path: string, body: unknown): Promise<void> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  }).catch(() => null);
  if (res?.ok) return;
  throw new ChangeError(changeFailure(await res?.json().catch(() => null)));
}

export const sendChangeCode = (ticket: string, phone: string) =>
  post("/api/identidade/troca/codigo", { ticket, telefone: phone });

/** The new number's code: the vault links it to the account. */
export const verifyChangeCode = (ticket: string, phone: string, code: string) =>
  post("/api/identidade/troca/verificar", { ticket, telefone: phone, codigo: code });
