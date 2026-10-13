/**
 * The vault's test harness: the store in memory with Postgres's contract, a gateway that collects
 * what it would send, and a sign-in helper. Imported by the *.test.ts files only.
 */
import { expect } from "bun:test";
import { readVaultAssertion, type VaultAssertion } from "@fala/core";
import { importVaultKeys, type VaultKeys } from "./crypto";
import { sendCode, verifyCode, type Change, type Gateway, type Link, type VaultStore } from "./gateway";

const raw = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
export const v1 = { seal: raw(), mac: raw() };
export const v2 = { seal: raw(), mac: raw() };
export const keysAt = (current: number, versions: Record<number, { seal: string; mac: string }>) =>
  importVaultKeys({
    VAULT_KEY_VERSION: String(current),
    VAULT_SEAL_KEYS: JSON.stringify(Object.fromEntries(Object.entries(versions).map(([v, k]) => [v, k.seal]))),
    VAULT_MAC_KEYS: JSON.stringify(Object.fromEntries(Object.entries(versions).map(([v, k]) => [v, k.mac]))),
  });

/** The store in memory, with the same contract as Postgres. */
export function memoryStore() {
  const hits: { key: string; at: Date }[] = [];
  const codes = new Map<string, { codeHash: string; attempts: number; expiresAt: Date }>();
  const links: (Link & { unlinkedAt: Date | null; phoneSealed: string })[] = [];
  const changes = new Map<string, Change & { ticketHash: string; hint: string | null }>();
  const store: VaultStore = {
    hitsSince: async (key, since) => hits.filter((h) => h.key === key && h.at >= since).map((h) => h.at),
    addHit: async (key, at) => void hits.push({ key, at }),
    putCode: async (mac, codeHash, expiresAt) => void codes.set(mac, { codeHash, attempts: 0, expiresAt }),
    getCode: async (mac) => codes.get(mac) ?? null,
    failCode: async (mac) => {
      const c = codes.get(mac);
      if (c) c.attempts++;
    },
    dropCode: async (mac) => void codes.delete(mac),
    findLink: async (macs) => links.find((l) => !l.unlinkedAt && macs.includes(l.phoneMac)) ?? null,
    link: async ({ replacing, accountId, phoneMac, phoneSealed, keyVersion, at }) => {
      const old = links.find((l) => l.id === replacing);
      if (old) old.unlinkedAt = at;
      links.push({
        id: crypto.randomUUID(),
        accountId,
        phoneMac,
        phoneSealed,
        keyVersion,
        verifiedAt: at,
        lastSignInAt: at,
        unlinkedAt: null,
      });
    },
    touch: async (id, at, rekey) => {
      const l = links.find((x) => x.id === id);
      if (!l) return;
      l.lastSignInAt = at;
      if (rekey) Object.assign(l, rekey);
    },
    linkOf: async (accountId) => links.find((l) => !l.unlinkedAt && l.accountId === accountId) ?? null,
    unlinkAccount: async (accountId, at) => {
      for (const l of links) if (l.accountId === accountId && !l.unlinkedAt) l.unlinkedAt = at;
    },
    putChange: async ({ accountId, ticketHash, expiresAt }) =>
      void changes.set(accountId, { accountId, ticketHash, expiresAt, sends: 0, completedAt: null, hint: null }),
    findChange: async (hash) => [...changes.values()].find((c) => c.ticketHash === hash) ?? null,
    countChangeSend: async (accountId) => {
      const c = changes.get(accountId);
      if (c) c.sends++;
    },
    completeChange: async ({ accountId, unlink, phoneMac, phoneSealed, keyVersion, hint, at }) => {
      for (const l of links) if (unlink.includes(l.id)) l.unlinkedAt = at;
      links.push({
        id: crypto.randomUUID(),
        accountId,
        phoneMac,
        phoneSealed,
        keyVersion,
        verifiedAt: at,
        lastSignInAt: at,
        unlinkedAt: null,
      });
      const c = changes.get(accountId);
      if (c) Object.assign(c, { completedAt: at, hint });
    },
    takeChange: async (accountId) => {
      const c = changes.get(accountId);
      if (!c?.completedAt || !c.hint) return null;
      changes.delete(accountId);
      return { hint: c.hint, completedAt: c.completedAt };
    },
  };
  return { store, links, codes, changes };
}

export async function gateway(keys?: VaultKeys) {
  const pair = await crypto.subtle.generateKey({ name: "Ed25519" }, false, ["sign", "verify"]);
  const sent: { phone: string; code: string }[] = [];
  const notices: { phone: string; text: string }[] = [];
  const mem = memoryStore();
  const g: Gateway = {
    store: mem.store,
    keys: keys ?? (await keysAt(1, { 1: v1 })),
    outbox: {
      deliver: async (phone, code) => void sent.push({ phone, code }),
      notice: async (phone, text) => void notices.push({ phone, text }),
    },
    human: async (token) => token === "humano",
    signingKey: pair.privateKey,
  };
  const read = async (token: string, now: Date): Promise<VaultAssertion | null> =>
    readVaultAssertion(token, pair.publicKey, Math.floor(now.getTime() / 1000));
  return { g, sent, notices, mem, read };
}

export const phone = "+5551991234567";
export const t0 = new Date("2026-10-12T15:00:00Z");
export const later = (ms: number) => new Date(t0.getTime() + ms);

export async function signIn(gw: Awaited<ReturnType<typeof gateway>>, now: Date) {
  expect(await sendCode(gw.g, { phone, token: "humano", ip: "203.0.113.7", now })).toEqual({ ok: true });
  const code = gw.sent.at(-1)?.code ?? "";
  const r = await verifyCode(gw.g, { phone, code, ip: "203.0.113.7", now });
  if (!r.ok) throw new Error(r.error);
  const a = await gw.read(r.assertion, now);
  if (!a) throw new Error("assertion");
  return a;
}
