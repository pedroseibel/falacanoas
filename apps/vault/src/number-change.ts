import {
  base64url,
  CODE_WINDOWS,
  CODE_WINDOWS_PER_IP,
  isBrazilianMobileE164,
  maskedPhone,
  sameText,
  VERIFY_WINDOWS_PER_IP,
} from "@fala/core";
import { codeHash, newCode, phoneMacs, sealPhone, unsealPhone } from "./crypto";
import { allowed, checkReauthCode, CODE_TRIES, CODE_TTL_MS, DORMANT_MS, type Gateway } from "./gateway";

/**
 * Changing number (DECISIONS round 18, Q20): recent re-authentication first (a code to the number on
 * the account, or a sign-in moments ago, a passkey's included), then a code to the new number. The
 * app vouches for the re-authentication and gets a ticket; the browser brings the ticket and the new
 * number here, so the app never sees it. Done, the old number is unlinked and told, without the new
 * one, and the app picks up the new hint to end the other sessions.
 */

export const CHANGE_TTL_MS = 15 * 60_000;
const CHANGE_SENDS = 3;
export const CHANGE_PICKUP_MS = 10 * 60_000;

/** What the old number receives: that the change happened, nothing about the new number. */
export const CHANGE_NOTICE =
  "Fala: o número ligado à sua conta acabou de ser trocado. Se não foi você, procure o canal de privacidade do Fala.";

/** A ticket has 256 random bits, so a plain SHA-256 is enough to keep it unusable at rest. */
const hashTicket = async (ticket: string) =>
  base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ticket))));

export async function beginChange(
  g: Gateway,
  input: { accountId: string; code: unknown; fresh: boolean; now: Date },
): Promise<{ ok: true; ticket: string } | { ok: false; error: "invalid" }> {
  const { accountId, now } = input;
  if (!input.fresh && !(await checkReauthCode(g, input))) return { ok: false, error: "invalid" };
  const ticket = base64url(crypto.getRandomValues(new Uint8Array(32)));
  await g.store.putChange({
    accountId,
    ticketHash: await hashTicket(ticket),
    expiresAt: new Date(now.getTime() + CHANGE_TTL_MS),
  });
  return { ok: true, ticket };
}

async function openChange(g: Gateway, ticket: unknown, now: Date) {
  if (typeof ticket !== "string" || !ticket || ticket.length > 100) return null;
  const change = await g.store.findChange(await hashTicket(ticket));
  return change && change.expiresAt > now && !change.completedAt ? change : null;
}

export type ChangeSendResult = { ok: true } | { ok: false; error: "expired" | "invalid" | "same" | "rate" | "send" };

export async function sendChangeCode(
  g: Gateway,
  input: { ticket: unknown; phone: unknown; ip: string | null; now: Date },
): Promise<ChangeSendResult> {
  const { phone, ip, now } = input;
  const change = await openChange(g, input.ticket, now);
  if (!change) return { ok: false, error: "expired" };
  if (typeof phone !== "string" || !isBrazilianMobileE164(phone)) return { ok: false, error: "invalid" };
  if (change.sends >= CHANGE_SENDS) return { ok: false, error: "rate" };
  const macs = await phoneMacs(g.keys, phone);
  const current = macs[0];
  if (!current) throw new Error("sem chave");
  const live = await g.store.linkOf(change.accountId);
  if (live && macs.some((m) => m.mac === live.phoneMac)) return { ok: false, error: "same" };
  if (ip && !(await allowed(g.store, `codigo:ip:${ip}`, CODE_WINDOWS_PER_IP, now))) return { ok: false, error: "rate" };
  if (!(await allowed(g.store, `codigo:telefone:${current.mac}`, CODE_WINDOWS, now)))
    return { ok: false, error: "rate" };
  const code = newCode();
  await g.store.putCode(current.mac, await codeHash(g.keys, current.mac, code), new Date(now.getTime() + CODE_TTL_MS));
  try {
    await g.outbox.deliver(phone, code);
  } catch {
    await g.store.dropCode(current.mac);
    return { ok: false, error: "send" };
  }
  await g.store.countChangeSend(change.accountId);
  return { ok: true };
}

export type ChangeVerifyResult =
  { ok: true; accountId: string } | { ok: false; error: "expired" | "invalid" | "taken" | "rate" };

export async function verifyChangeCode(
  g: Gateway,
  input: { ticket: unknown; phone: unknown; code: unknown; ip: string | null; now: Date },
): Promise<ChangeVerifyResult> {
  const { phone, code, ip, now } = input;
  const change = await openChange(g, input.ticket, now);
  if (!change) return { ok: false, error: "expired" };
  if (typeof phone !== "string" || !isBrazilianMobileE164(phone) || typeof code !== "string" || !/^\d{6}$/.test(code))
    return { ok: false, error: "invalid" };
  if (ip && !(await allowed(g.store, `verificar:ip:${ip}`, VERIFY_WINDOWS_PER_IP, now)))
    return { ok: false, error: "rate" };
  const macs = await phoneMacs(g.keys, phone);
  const current = macs[0];
  if (!current) throw new Error("sem chave");
  const waiting = await g.store.getCode(current.mac);
  if (!waiting || waiting.expiresAt <= now || waiting.attempts >= CODE_TRIES) return { ok: false, error: "invalid" };
  if (!sameText(waiting.codeHash, await codeHash(g.keys, current.mac, code))) {
    await g.store.failCode(current.mac);
    return { ok: false, error: "invalid" };
  }
  await g.store.dropCode(current.mac);

  // Whoever holds the new number may learn it already has an account: they just proved it's theirs.
  // A dormant link (180 days, Q20) gives way, as at sign-in: the number may have been recycled.
  const other = await g.store.findLink(macs.map((m) => m.mac));
  if (other && other.accountId !== change.accountId && now.getTime() - other.lastSignInAt.getTime() < DORMANT_MS)
    return { ok: false, error: "taken" };
  const live = await g.store.linkOf(change.accountId);
  await g.store.completeChange({
    accountId: change.accountId,
    unlink: [...new Set([live?.id, other?.id].filter((id): id is string => Boolean(id)))],
    phoneMac: current.mac,
    phoneSealed: await sealPhone(g.keys, phone),
    keyVersion: g.keys.current,
    hint: maskedPhone(phone),
    at: now,
  });
  if (live) {
    const old = await unsealPhone(g.keys, live.keyVersion, live.phoneSealed);
    // Without a provider (or with it down) the change still stands; the notice is a courtesy.
    await g.outbox.notice(old, CHANGE_NOTICE).catch(() => undefined);
  }
  return { ok: true, accountId: change.accountId };
}

/** For the app: the account's change, if it finished in the last few minutes; read once. */
export async function takeChange(
  g: Gateway,
  input: { accountId: string; now: Date },
): Promise<{ hint: string; verifiedAt: Date } | null> {
  const done = await g.store.takeChange(input.accountId);
  if (!done || input.now.getTime() - done.completedAt.getTime() > CHANGE_PICKUP_MS) return null;
  return { hint: done.hint, verifiedAt: done.completedAt };
}
