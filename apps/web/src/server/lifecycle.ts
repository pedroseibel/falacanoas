import { connectionFromHeaders } from "@fala/core";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { TransactionRollbackError } from "drizzle-orm/errors";
import { z } from "zod";
import { auth } from "./auth";
import { db } from "./db/client";
import { nickReservations, users } from "./db/schema";
import type { Failure } from "./member";
import { getSession } from "./session";

/**
 * The account's lifecycle (DECISIONS round 18, Q20, Q26). Sensitive changes need a fresh code to the
 * number already on the account, which the vault looks up: a session cookie alone isn't enough.
 */

const UNAVAILABLE = "Não deu para falar com o cofre agora. Tente de novo em alguns minutos.";
const WRONG_CODE = "Código errado ou vencido. Confira os números ou peça outro.";

const SEND_ERROR = {
  unlinked: "Esta conta não tem mais um número ligado. Escreva para o canal de privacidade.",
  rate: "Muitos códigos em pouco tempo. Espere 15 minutos.",
  send: "Não deu para mandar o código agora. Tente de novo em alguns minutos.",
} satisfies Record<string, string>;

/** Signed in with a phone: guests have nothing to close. */
async function phoneAccount() {
  const user = (await getSession())?.user;
  return user && !user.isAnonymous && user.phoneVerifiedAt ? user : null;
}

export type ReauthResult = Failure | { ok: true; hint: string; devCode: string | null };

/** Sends the re-authentication code; returns the masked number it went to. */
export const requestReauthCode = createServerFn({ method: "POST" }).handler(async (): Promise<ReauthResult> => {
  const user = await phoneAccount();
  if (!user) return { ok: false, error: "Entre com o seu celular primeiro." };
  if (!env.VAULT) return { ok: false, error: UNAVAILABLE };
  const r = await env.VAULT.reauthCode(user.id).catch(() => null);
  if (!r) return { ok: false, error: UNAVAILABLE };
  return r.ok ? r : { ok: false, error: SEND_ERROR[r.error] };
});

/**
 * Closes the account (round 18, Q26). Its public history stays, unlinked from it: items lose their
 * author link, replies their account, and the apelido stays reserved if it ever signed anything. The
 * profile, sessions, passkeys, follows and votes go. The vault unlinks the number and keeps it, with
 * the access evidence, for the 6 months the law asks, then deletes it.
 *
 * The app's deletion commits only if the vault accepted the code and closed its side.
 */
export const closeAccount = createServerFn({ method: "POST" })
  .inputValidator(z.object({ code: z.string().regex(/^\d{6}$/) }))
  .handler(async ({ data }): Promise<Failure | { ok: true }> => {
    const user = await phoneAccount();
    if (!user) return { ok: false, error: "Entre com o seu celular primeiro." };
    const vault = env.VAULT;
    if (!vault) return { ok: false, error: UNAVAILABLE };
    const headers = getRequestHeaders();
    const connection = connectionFromHeaders(new Headers(headers));
    const now = new Date();
    const closed = await db
      .transaction(async (tx) => {
        await tx
          .update(nickReservations)
          .set({ ownerId: null, releasedAt: now })
          .where(eq(nickReservations.ownerId, user.id));
        await tx.delete(users).where(eq(users.id, user.id));
        const r = await vault.close(user.id, data.code, connection);
        if (!r.ok) tx.rollback();
        return true;
      })
      .catch((e: unknown) => {
        if (e instanceof TransactionRollbackError) return false;
        throw e;
      });
    if (!closed) return { ok: false, error: WRONG_CODE };
    // The session rows went with the account; this clears the cookie.
    await auth.api.signOut({ headers }).catch(() => null);
    return { ok: true };
  });
