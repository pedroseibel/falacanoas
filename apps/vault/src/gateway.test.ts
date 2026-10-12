// Rate limits depend on the order of requests, so these tests await them one at a time.
/* oxlint-disable no-await-in-loop */
import { describe, expect, test } from "bun:test";
import { readVaultAssertion, type VaultAssertion } from "@fala/core";
import { importVaultKeys, type VaultKeys } from "./crypto";
import { DORMANT_MS, sendCode, verifyCode, type Gateway, type Link, type VaultStore } from "./gateway";

const raw = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
const v1 = { seal: raw(), mac: raw() };
const v2 = { seal: raw(), mac: raw() };
const keysAt = (current: number, versions: Record<number, { seal: string; mac: string }>) =>
  importVaultKeys({
    VAULT_KEY_VERSION: String(current),
    VAULT_SEAL_KEYS: JSON.stringify(Object.fromEntries(Object.entries(versions).map(([v, k]) => [v, k.seal]))),
    VAULT_MAC_KEYS: JSON.stringify(Object.fromEntries(Object.entries(versions).map(([v, k]) => [v, k.mac]))),
  });

/** The store in memory, with the same contract as Postgres. */
function memoryStore() {
  const hits: { key: string; at: Date }[] = [];
  const codes = new Map<string, { codeHash: string; attempts: number; expiresAt: Date }>();
  const links: (Link & { unlinkedAt: Date | null; phoneSealed: string })[] = [];
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
  };
  return { store, links, codes };
}

async function gateway(keys?: VaultKeys) {
  const pair = await crypto.subtle.generateKey({ name: "Ed25519" }, false, ["sign", "verify"]);
  const sent: { phone: string; code: string }[] = [];
  const mem = memoryStore();
  const g: Gateway = {
    store: mem.store,
    keys: keys ?? (await keysAt(1, { 1: v1 })),
    outbox: { deliver: async (phone, code) => void sent.push({ phone, code }) },
    human: async (token) => token === "humano",
    signingKey: pair.privateKey,
  };
  const read = async (token: string, now: Date): Promise<VaultAssertion | null> =>
    readVaultAssertion(token, pair.publicKey, Math.floor(now.getTime() / 1000));
  return { g, sent, mem, read };
}

const phone = "+5551991234567";
const t0 = new Date("2026-10-12T15:00:00Z");
const later = (ms: number) => new Date(t0.getTime() + ms);

async function signIn(gw: Awaited<ReturnType<typeof gateway>>, now: Date) {
  expect(await sendCode(gw.g, { phone, token: "humano", ip: "203.0.113.7", now })).toEqual({ ok: true });
  const code = gw.sent.at(-1)?.code ?? "";
  const r = await verifyCode(gw.g, { phone, code, ip: "203.0.113.7", now });
  if (!r.ok) throw new Error(r.error);
  const a = await gw.read(r.assertion, now);
  if (!a) throw new Error("assertion");
  return a;
}

describe("sending a code", () => {
  test("only Brazilian mobiles, only with a passing robot check", async () => {
    const { g } = await gateway();
    expect(await sendCode(g, { phone: "+555133334444", token: "humano", ip: null, now: t0 })).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(await sendCode(g, { phone, token: "robô", ip: null, now: t0 })).toEqual({ ok: false, error: "robot" });
    expect(await sendCode(g, { phone, token: undefined, ip: null, now: t0 })).toEqual({ ok: false, error: "robot" });
  });

  test("three codes per number every 15 minutes", async () => {
    const { g } = await gateway();
    for (let i = 0; i < 3; i++)
      expect((await sendCode(g, { phone, token: "humano", ip: null, now: later(i * 1000) })).ok).toBeTrue();
    expect(await sendCode(g, { phone, token: "humano", ip: null, now: later(5000) })).toEqual({
      ok: false,
      error: "rate",
    });
    expect((await sendCode(g, { phone, token: "humano", ip: null, now: later(15 * 60_000) })).ok).toBeTrue();
  });

  test("ten codes per IP every 15 minutes, across numbers", async () => {
    const { g } = await gateway();
    for (let i = 0; i < 10; i++)
      expect(
        (
          await sendCode(g, {
            phone: `+55519912345${String(i).padStart(2, "0")}`,
            token: "humano",
            ip: "198.51.100.1",
            now: t0,
          })
        ).ok,
      ).toBeTrue();
    expect(await sendCode(g, { phone, token: "humano", ip: "198.51.100.1", now: t0 })).toEqual({
      ok: false,
      error: "rate",
    });
  });

  test("no plaintext code or number is stored", async () => {
    const gw = await gateway();
    await sendCode(gw.g, { phone, token: "humano", ip: null, now: t0 });
    const code = gw.sent[0]?.code ?? "";
    const stored = JSON.stringify([...gw.mem.codes.entries()]);
    expect(stored).not.toContain(code);
    expect(stored).not.toContain("991234567");
  });
});

describe("checking a code", () => {
  test("a first verification creates the account; the next one reopens it", async () => {
    const gw = await gateway();
    const first = await signIn(gw, t0);
    expect(first).toMatchObject({ created: true, hint: "(51) 9…4567", phoneVerifiedAt: t0.toISOString() });
    const again = await signIn(gw, later(3_600_000));
    expect(again).toMatchObject({ created: false, sub: first.sub, phoneVerifiedAt: t0.toISOString() });
    expect(again.jti).not.toBe(first.jti);
    expect(JSON.stringify(gw.mem.links)).not.toContain("991234567");
  });

  test("three wrong tries spend the code; a code works once", async () => {
    const gw = await gateway();
    await sendCode(gw.g, { phone, token: "humano", ip: null, now: t0 });
    const code = gw.sent[0]?.code ?? "";
    const wrong = code === "000000" ? "111111" : "000000";
    for (let i = 0; i < 3; i++)
      expect(await verifyCode(gw.g, { phone, code: wrong, ip: null, now: t0 })).toEqual({
        ok: false,
        error: "invalid",
      });
    expect(await verifyCode(gw.g, { phone, code, ip: null, now: t0 })).toEqual({ ok: false, error: "invalid" });

    await sendCode(gw.g, { phone, token: "humano", ip: null, now: later(1000) });
    const fresh = gw.sent[1]?.code ?? "";
    expect((await verifyCode(gw.g, { phone, code: fresh, ip: null, now: later(2000) })).ok).toBeTrue();
    expect((await verifyCode(gw.g, { phone, code: fresh, ip: null, now: later(3000) })).ok).toBeFalse();
  });

  test("a code expires after 5 minutes", async () => {
    const gw = await gateway();
    await sendCode(gw.g, { phone, token: "humano", ip: null, now: t0 });
    expect(
      (await verifyCode(gw.g, { phone, code: gw.sent[0]?.code, ip: null, now: later(5 * 60_000) })).ok,
    ).toBeFalse();
  });

  test("after 180 days without signing in, the number opens a new account", async () => {
    const gw = await gateway();
    const first = await signIn(gw, t0);
    const back = await signIn(gw, later(DORMANT_MS + 60_000));
    expect(back.created).toBeTrue();
    expect(back.sub).not.toBe(first.sub);
    expect(gw.mem.links.filter((l) => !l.unlinkedAt)).toHaveLength(1);
    expect(gw.mem.links.find((l) => l.accountId === first.sub)?.unlinkedAt).toBeInstanceOf(Date);
  });

  test("a link written under an old key is found and rewritten under the current one", async () => {
    const gw = await gateway(await keysAt(1, { 1: v1 }));
    const first = await signIn(gw, t0);
    gw.g.keys = await keysAt(2, { 1: v1, 2: v2 });
    const again = await signIn(gw, later(60_000));
    expect(again.sub).toBe(first.sub);
    expect(gw.mem.links[0]?.keyVersion).toBe(2);
  });
});
