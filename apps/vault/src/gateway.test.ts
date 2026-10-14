// Rate limits depend on the order of requests, so these tests await them one at a time.
/* oxlint-disable no-await-in-loop */
import { describe, expect, test } from "bun:test";
import { WHATSAPP_AUDIENCE } from "@fala/core";
import { closeAccount, DORMANT_MS, sendCode, sendReauthCode, verifyCode, whatsappAccount } from "./gateway";
import { gateway, keysAt, later, phone, signIn, t0, v1, v2 } from "./testing";

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

describe("re-authenticating and closing an account", () => {
  test("the code goes to the number already linked, found by account", async () => {
    const gw = await gateway();
    const a = await signIn(gw, t0);
    const r = await sendReauthCode(gw.g, { accountId: a.sub, now: later(60_000) });
    expect(r).toEqual({ ok: true, hint: "(51) 9…4567" });
    expect(gw.sent.at(-1)?.phone).toBe(phone);
  });

  test("an account with no live number can't re-authenticate by code", async () => {
    const gw = await gateway();
    expect(await sendReauthCode(gw.g, { accountId: crypto.randomUUID(), now: t0 })).toEqual({
      ok: false,
      error: "unlinked",
    });
  });

  test("three codes per account every 15 minutes", async () => {
    const gw = await gateway();
    const a = await signIn(gw, t0);
    for (const s of [1, 2, 3])
      expect((await sendReauthCode(gw.g, { accountId: a.sub, now: later(s * 1000) })).ok).toBeTrue();
    expect(await sendReauthCode(gw.g, { accountId: a.sub, now: later(4000) })).toEqual({ ok: false, error: "rate" });
  });

  test("closing needs the right code, then unlinks the number: the next code opens a new account", async () => {
    const gw = await gateway();
    const a = await signIn(gw, t0);
    await sendReauthCode(gw.g, { accountId: a.sub, now: later(1000) });
    const code = gw.sent.at(-1)?.code ?? "";
    const wrong = code === "000000" ? "111111" : "000000";
    expect(await closeAccount(gw.g, { accountId: a.sub, code: wrong, now: later(2000) })).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(gw.mem.links.every((l) => !l.unlinkedAt)).toBeTrue();
    expect(await closeAccount(gw.g, { accountId: a.sub, code, now: later(3000) })).toEqual({ ok: true });
    expect(gw.mem.links.find((l) => l.accountId === a.sub)?.unlinkedAt).toBeInstanceOf(Date);
    // The code was used once.
    expect((await closeAccount(gw.g, { accountId: a.sub, code, now: later(4000) })).ok).toBeFalse();
    const next = await signIn(gw, later(60_000));
    expect(next.created).toBeTrue();
    expect(next.sub).not.toBe(a.sub);
  });
});

describe("the account behind a WhatsApp number", () => {
  test("names the account, for the WhatsApp service only, never as a sign-in", async () => {
    const gw = await gateway();
    const me = await signIn(gw, t0);
    const r = await whatsappAccount(gw.g, { from: "5551991234567", now: later(60_000) });
    if (!r.ok) throw new Error(r.error);
    expect(await gw.read(r.assertion, later(60_000))).toBeNull();
    const a = await gw.read(r.assertion, later(60_000), WHATSAPP_AUDIENCE);
    expect(a).toMatchObject({ aud: WHATSAPP_AUDIENCE, sub: me.sub, created: false, hint: "(51) 9…4567" });
    expect(r.assertion).not.toContain("991234567");
  });

  test("finds the account when WhatsApp drops the ninth digit", async () => {
    const gw = await gateway();
    const me = await signIn(gw, t0);
    const r = await whatsappAccount(gw.g, { from: "555191234567", now: t0 });
    if (!r.ok) throw new Error(r.error);
    expect((await gw.read(r.assertion, t0, WHATSAPP_AUDIENCE))?.sub).toBe(me.sub);
  });

  test("a number without an account, or dormant, or malformed, gets nothing", async () => {
    const gw = await gateway();
    expect(await whatsappAccount(gw.g, { from: "5551991234567", now: t0 })).toEqual({ ok: false, error: "unlinked" });
    await signIn(gw, t0);
    expect(await whatsappAccount(gw.g, { from: "5551991234567", now: later(DORMANT_MS) })).toEqual({
      ok: false,
      error: "unlinked",
    });
    expect(await whatsappAccount(gw.g, { from: "+55 51 99123", now: t0 })).toEqual({ ok: false, error: "invalid" });
    expect(await whatsappAccount(gw.g, { from: 5551991234567, now: t0 })).toEqual({ ok: false, error: "invalid" });
  });

  test("a number is looked up at most 40 times a day", async () => {
    const gw = await gateway();
    await signIn(gw, t0);
    for (let i = 0; i < 40; i++)
      // oxlint-disable-next-line no-await-in-loop
      expect((await whatsappAccount(gw.g, { from: "5551991234567", now: later(i * 1000) })).ok).toBeTrue();
    expect(await whatsappAccount(gw.g, { from: "5551991234567", now: later(41_000) })).toEqual({
      ok: false,
      error: "rate",
    });
  });
});
