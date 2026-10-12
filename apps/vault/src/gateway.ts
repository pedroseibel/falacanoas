import {
  admit,
  CODE_WINDOWS,
  CODE_WINDOWS_PER_IP,
  isBrazilianMobileE164,
  maskedPhone,
  signVaultAssertion,
  VAULT_ASSERTION_TTL,
  VAULT_AUDIENCE,
  VERIFY_WINDOWS_PER_IP,
  type Window,
} from "@fala/core";
import { codeHash, newCode, phoneMacs, same, sealPhone, type VaultKeys } from "./crypto";

/**
 * The auth gateway (DECISIONS round 18, Q16, Q20, Q29): it receives the phone, sends and checks the
 * code, keeps the phone ↔ account link, and hands the app a signed assertion naming the account.
 * The answers never reveal whether a number already has an account.
 *
 * Storage, delivery and the robot check sit behind interfaces, so the rules are tested without a
 * database or a network.
 */

export const CODE_TTL_MS = 5 * 60_000;
export const CODE_TRIES = 3;
/** After 180 days without signing in, a code no longer reopens the account (ANATEL quarantine, Q20). */
export const DORMANT_MS = 180 * 24 * 3_600_000;

export interface Link {
  id: string;
  accountId: string;
  keyVersion: number;
  phoneMac: string;
  verifiedAt: Date;
  lastSignInAt: Date;
}

export interface VaultStore {
  /** Hit times for a rate-limit key since `since`. */
  hitsSince(key: string, since: Date): Promise<Date[]>;
  addHit(key: string, at: Date): Promise<void>;
  putCode(phoneMac: string, codeHash: string, expiresAt: Date): Promise<void>;
  getCode(phoneMac: string): Promise<{ codeHash: string; attempts: number; expiresAt: Date } | null>;
  /** Counts a wrong try. */
  failCode(phoneMac: string): Promise<void>;
  dropCode(phoneMac: string): Promise<void>;
  /** The live link for any of these lookup HMACs. */
  findLink(phoneMacs: string[]): Promise<Link | null>;
  /**
   * In one transaction: unlink `replacing` (if any), then link the phone to `accountId`. Two
   * verifications racing for one number can't both win: the live HMAC is unique.
   */
  link(input: {
    replacing: string | null;
    accountId: string;
    phoneMac: string;
    phoneSealed: string;
    keyVersion: number;
    at: Date;
  }): Promise<void>;
  /** A sign-in: records it, and rewrites the link under the current key if it was found under an old one. */
  touch(
    linkId: string,
    at: Date,
    rekey: { phoneMac: string; phoneSealed: string; keyVersion: number } | null,
  ): Promise<void>;
}

export interface Outbox {
  deliver(phone: string, code: string): Promise<void>;
}

export type Human = (token: string, ip: string | null) => Promise<boolean>;

export type SendResult = { ok: true } | { ok: false; error: "invalid" | "robot" | "rate" | "send" };
export type VerifyResult = { ok: true; assertion: string } | { ok: false; error: "invalid" | "rate" };

export interface Gateway {
  store: VaultStore;
  keys: VaultKeys;
  outbox: Outbox;
  human: Human;
  signingKey: CryptoKey;
}

async function allowed(store: VaultStore, key: string, windows: Window[], now: Date): Promise<boolean> {
  const longest = Math.max(...windows.map((w) => w.ms));
  const past = await store.hitsSince(key, new Date(now.getTime() - longest));
  if (
    !admit(
      past.map((d) => d.getTime()),
      now.getTime(),
      windows,
    ).ok
  )
    return false;
  await store.addHit(key, now);
  return true;
}

export async function sendCode(
  g: Gateway,
  input: { phone: unknown; token: unknown; ip: string | null; now: Date },
): Promise<SendResult> {
  const { phone, token, ip, now } = input;
  if (typeof phone !== "string" || !isBrazilianMobileE164(phone)) return { ok: false, error: "invalid" };
  if (typeof token !== "string" || !token || !(await g.human(token, ip))) return { ok: false, error: "robot" };
  const [current] = await phoneMacs(g.keys, phone);
  if (!current) throw new Error("sem chave");
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
  return { ok: true };
}

export async function verifyCode(
  g: Gateway,
  input: { phone: unknown; code: unknown; ip: string | null; now: Date },
): Promise<VerifyResult> {
  const { phone, code, ip, now } = input;
  if (typeof phone !== "string" || !isBrazilianMobileE164(phone) || typeof code !== "string" || !/^\d{6}$/.test(code))
    return { ok: false, error: "invalid" };
  if (ip && !(await allowed(g.store, `verificar:ip:${ip}`, VERIFY_WINDOWS_PER_IP, now)))
    return { ok: false, error: "rate" };
  const macs = await phoneMacs(g.keys, phone);
  const current = macs[0];
  if (!current) throw new Error("sem chave");

  const waiting = await g.store.getCode(current.mac);
  if (!waiting || waiting.expiresAt <= now || waiting.attempts >= CODE_TRIES) return { ok: false, error: "invalid" };
  if (!same(waiting.codeHash, await codeHash(g.keys, current.mac, code))) {
    await g.store.failCode(current.mac);
    return { ok: false, error: "invalid" };
  }
  await g.store.dropCode(current.mac);

  const link = await g.store.findLink(macs.map((m) => m.mac));
  let accountId: string;
  let verifiedAt: Date;
  let created: boolean;
  if (link && now.getTime() - link.lastSignInAt.getTime() < DORMANT_MS) {
    const rekey =
      link.keyVersion === g.keys.current
        ? null
        : { phoneMac: current.mac, phoneSealed: await sealPhone(g.keys, phone), keyVersion: g.keys.current };
    await g.store.touch(link.id, now, rekey);
    accountId = link.accountId;
    verifiedAt = link.verifiedAt;
    created = false;
  } else {
    // New number, or a dormant one (possibly recycled by the carrier): a new account. The old one keeps
    // its history and reopens only with a passkey it registered before.
    accountId = crypto.randomUUID();
    verifiedAt = now;
    created = true;
    await g.store.link({
      replacing: link?.id ?? null,
      accountId,
      phoneMac: current.mac,
      phoneSealed: await sealPhone(g.keys, phone),
      keyVersion: g.keys.current,
      at: now,
    });
  }

  const iat = Math.floor(now.getTime() / 1000);
  const assertion = await signVaultAssertion(
    {
      aud: VAULT_AUDIENCE,
      sub: accountId,
      created,
      phoneVerifiedAt: verifiedAt.toISOString(),
      hint: maskedPhone(phone),
      iat,
      exp: iat + VAULT_ASSERTION_TTL,
      jti: crypto.randomUUID(),
    },
    g.signingKey,
  );
  return { ok: true, assertion };
}
