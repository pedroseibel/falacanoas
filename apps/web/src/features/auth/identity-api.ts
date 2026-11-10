import { z } from "zod";
import { sendFailure, type SendFailure } from "./send-code";

/**
 * The browser's side of phone sign-in. The number goes only to the identity vault's gateway
 * (/api/identidade/*, routed to the vault Worker); the app's auth API receives the vault's signed
 * assertion, never the number (DECISIONS round 18, Q29).
 */

export class SendError extends Error {
  constructor(readonly failure: SendFailure) {
    super(failure);
  }
}

const post = (path: string, body: unknown) =>
  fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });

/** Throws a SendError naming why it wasn't sent. */
export async function requestCode(phone: string, token: string): Promise<void> {
  const res = await post("/api/identidade/codigo", { telefone: phone, token }).catch(() => null);
  if (!res?.ok) throw new SendError(sendFailure(res?.status));
}

const VerifiedSchema = z.object({ ok: z.literal(true), assertion: z.string() });

/** Throws when the code isn't right. */
export async function signInWithCode(phone: string, code: string): Promise<void> {
  const res = await post("/api/identidade/verificar", { telefone: phone, codigo: code });
  const verified = VerifiedSchema.safeParse(await res.json().catch(() => null));
  if (!res.ok || !verified.success) throw new Error(res.status === 429 ? "rate" : "invalid");
  const session = await post("/api/auth/sign-in/vault", { assertion: verified.data.assertion });
  if (!session.ok) throw new Error("session");
}

const DevCodeSchema = z.object({ codigo: z.string().nullable() });

/** Development only: the code that would have gone to WhatsApp. */
export async function devCode(phone: string): Promise<string | null> {
  const res = await fetch(`/api/identidade/dev/codigo?telefone=${encodeURIComponent(phone)}`);
  const body = DevCodeSchema.safeParse(await res.json().catch(() => null));
  return body.success ? body.data.codigo : null;
}
