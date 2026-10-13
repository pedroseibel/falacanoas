import { connectionFromHeaders } from "@fala/core";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { env } from "cloudflare:workers";
import { and, eq, ne } from "drizzle-orm";
import { TransactionRollbackError } from "drizzle-orm/errors";
import { z } from "zod";
import { auth } from "./auth";
import { collectMyData, type MyData } from "./data-export";
import { db } from "./db/client";
import { nickReservations, sessions, users } from "./db/schema";
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

/** "Baixar meus dados" (LGPD art. 18, II and V): everything the app holds about the account, as JSON. */
export const exportMyData = createServerFn({ method: "GET" }).handler(async (): Promise<MyData | null> => {
  const user = await phoneAccount();
  return user ? collectMyData(user.id) : null;
});

/** A sign-in this recent counts as re-authentication (a passkey's included): no code needed. */
const RECENT_SIGN_IN_MS = 5 * 60_000;

export type ChangeStart = (Failure & { reauth?: true }) | { ok: true; ticket: string };

/**
 * Starts changing the number (round 18, Q20): with the code just sent to the current number, or
 * with none if the session is minutes old. The ticket goes to the browser, which takes it and the new
 * number to the vault: the app never sees the new number either.
 */
export const startNumberChange = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      code: z
        .string()
        .regex(/^\d{6}$/)
        .nullable(),
    }),
  )
  .handler(async ({ data }): Promise<ChangeStart> => {
    const s = await getSession();
    const user = s?.user;
    if (!s || !user || user.isAnonymous || !user.phoneVerifiedAt)
      return { ok: false, error: "Entre com o seu celular primeiro." };
    if (!env.VAULT) return { ok: false, error: UNAVAILABLE };
    const fresh = Date.now() - s.session.createdAt.getTime() < RECENT_SIGN_IN_MS;
    if (!data.code && !fresh) return { ok: false, error: "Confirme que é você.", reauth: true };
    const r = await env.VAULT.beginChange(user.id, data.code, !data.code && fresh).catch(() => null);
    if (!r) return { ok: false, error: UNAVAILABLE };
    return r.ok ? r : { ok: false, error: WRONG_CODE };
  });

/**
 * Finishes the change: the vault confirmed the new number, so the account shows its hint, the 72-hour
 * wait for confirmations starts again (as for any new number, Q17), and every other session ends.
 */
export const finishNumberChange = createServerFn({ method: "POST" }).handler(
  async (): Promise<Failure | { ok: true; hint: string }> => {
    const s = await getSession();
    if (!s || s.user.isAnonymous) return { ok: false, error: "Entre com o seu celular primeiro." };
    if (!env.VAULT) return { ok: false, error: UNAVAILABLE };
    const done = await env.VAULT.takeChange(s.user.id).catch(() => null);
    if (!done) return { ok: false, error: "A troca não terminou. Comece de novo." };
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ phoneHint: done.hint, phoneVerifiedAt: done.verifiedAt, updatedAt: new Date() })
        .where(eq(users.id, s.user.id));
      await tx.delete(sessions).where(and(eq(sessions.userId, s.user.id), ne(sessions.id, s.session.id)));
    });
    return { ok: true, hint: done.hint };
  },
);
