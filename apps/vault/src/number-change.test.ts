// Rate limits and tickets depend on the order of requests, so these tests await them one at a time.
/* oxlint-disable no-await-in-loop */
import { describe, expect, test } from "bun:test";
import { DORMANT_MS, sendCode, sendReauthCode, verifyCode } from "./gateway";
import {
  beginChange,
  CHANGE_NOTICE,
  CHANGE_PICKUP_MS,
  CHANGE_TTL_MS,
  sendChangeCode,
  takeChange,
  verifyChangeCode,
} from "./number-change";
import { gateway, later, phone, signIn, t0 } from "./testing";

const next = "+5551988887777";
const third = "+5553999990000";

type Gw = Awaited<ReturnType<typeof gateway>>;

async function ticketFor(gw: Gw, accountId: string, at: Date): Promise<string> {
  await sendReauthCode(gw.g, { accountId, now: at });
  const r = await beginChange(gw.g, { accountId, code: gw.sent.at(-1)?.code, fresh: false, now: at });
  if (!r.ok) throw new Error(r.error);
  return r.ticket;
}

async function changeTo(gw: Gw, ticket: string, to: string, at: Date) {
  expect(await sendChangeCode(gw.g, { ticket, phone: to, ip: null, now: at })).toEqual({ ok: true });
  return verifyChangeCode(gw.g, { ticket, phone: to, code: gw.sent.at(-1)?.code, ip: null, now: at });
}

describe("changing number", () => {
  test("re-authenticated by code, the new number replaces the old; the old one is told, without the new", async () => {
    const gw = await gateway();
    const a = await signIn(gw, t0);
    const ticket = await ticketFor(gw, a.sub, later(1000));
    expect(await changeTo(gw, ticket, next, later(2000))).toEqual({ ok: true, accountId: a.sub });

    const live = gw.mem.links.filter((l) => !l.unlinkedAt);
    expect(live).toHaveLength(1);
    expect(live[0]?.accountId).toBe(a.sub);
    expect(gw.mem.links.filter((l) => l.unlinkedAt)).toHaveLength(1);
    expect(gw.notices).toEqual([{ phone, text: CHANGE_NOTICE }]);

    // The app picks the result up once.
    expect(await takeChange(gw.g, { accountId: a.sub, now: later(3000) })).toEqual({
      hint: "(51) 9…7777",
      verifiedAt: later(2000),
    });
    expect(await takeChange(gw.g, { accountId: a.sub, now: later(4000) })).toBeNull();

    // The new number signs in to the same account; the old one would open a new account.
    expect((await signIn(gw, later(60_000))).sub).not.toBe(a.sub);
  });

  test("without re-authentication there's no ticket: a wrong code, or no code and no fresh sign-in", async () => {
    const gw = await gateway();
    const a = await signIn(gw, t0);
    await sendReauthCode(gw.g, { accountId: a.sub, now: later(1000) });
    const right = gw.sent.at(-1)?.code ?? "";
    const wrong = right === "000000" ? "111111" : "000000";
    expect(await beginChange(gw.g, { accountId: a.sub, code: wrong, fresh: false, now: later(2000) })).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(await beginChange(gw.g, { accountId: a.sub, code: null, fresh: false, now: later(2000) })).toEqual({
      ok: false,
      error: "invalid",
    });
    // A sign-in moments ago (a passkey's, say) is enough, as the app vouches.
    expect((await beginChange(gw.g, { accountId: a.sub, code: null, fresh: true, now: later(2000) })).ok).toBeTrue();
  });

  test("a ticket expires, works for one change, and sends at most three codes", async () => {
    const gw = await gateway();
    const a = await signIn(gw, t0);
    const old = await ticketFor(gw, a.sub, later(1000));
    expect(
      await sendChangeCode(gw.g, { ticket: old, phone: next, ip: null, now: later(CHANGE_TTL_MS + 2000) }),
    ).toEqual({ ok: false, error: "expired" });

    const ticket = await ticketFor(gw, a.sub, later(CHANGE_TTL_MS + 3000));
    // Asking again replaces the earlier ticket.
    expect(
      (await sendChangeCode(gw.g, { ticket: old, phone: next, ip: null, now: later(CHANGE_TTL_MS + 4000) })).ok,
    ).toBeFalse();
    for (const s of [1, 2, 3])
      expect(
        (
          await sendChangeCode(gw.g, {
            ticket,
            phone: [next, third, next][s - 1],
            ip: null,
            now: later(CHANGE_TTL_MS + 4000 + s),
          })
        ).ok,
      ).toBeTrue();
    expect(await sendChangeCode(gw.g, { ticket, phone: third, ip: null, now: later(CHANGE_TTL_MS + 5000) })).toEqual({
      ok: false,
      error: "rate",
    });
    const code = gw.sent.at(-1)?.code;
    expect(
      (await verifyChangeCode(gw.g, { ticket, phone: next, code, ip: null, now: later(CHANGE_TTL_MS + 6000) })).ok,
    ).toBeTrue();
    // Done: the ticket opens nothing more.
    expect(
      (await sendChangeCode(gw.g, { ticket, phone: third, ip: null, now: later(CHANGE_TTL_MS + 7000) })).ok,
    ).toBeFalse();
  });

  test("the same number isn't a change", async () => {
    const gw = await gateway();
    const a = await signIn(gw, t0);
    const ticket = await ticketFor(gw, a.sub, later(1000));
    expect(await sendChangeCode(gw.g, { ticket, phone, ip: null, now: later(2000) })).toEqual({
      ok: false,
      error: "same",
    });
  });

  test("a number with a live account can't be taken; a dormant one can, as at sign-in", async () => {
    const gw = await gateway();
    // Someone else's account on `next`.
    await sendCode(gw.g, { phone: next, token: "humano", ip: null, now: t0 });
    expect((await verifyCode(gw.g, { phone: next, code: gw.sent.at(-1)?.code, ip: null, now: t0 })).ok).toBeTrue();

    const a = await signIn(gw, later(1000));
    const ticket = await ticketFor(gw, a.sub, later(2000));
    expect(await changeTo(gw, ticket, next, later(3000))).toEqual({ ok: false, error: "taken" });

    // 180 days on, without signing in, the other account's hold on the number lapses.
    const late = later(DORMANT_MS + 60_000);
    const again = await ticketFor(gw, a.sub, late);
    expect((await changeTo(gw, again, next, late)).ok).toBeTrue();
    expect(gw.mem.links.filter((l) => !l.unlinkedAt).map((l) => l.accountId)).toEqual([a.sub]);
  });

  test("a finished change waits a few minutes for the app, then lapses", async () => {
    const gw = await gateway();
    const a = await signIn(gw, t0);
    const ticket = await ticketFor(gw, a.sub, later(1000));
    await changeTo(gw, ticket, next, later(2000));
    expect(await takeChange(gw.g, { accountId: a.sub, now: later(2000 + CHANGE_PICKUP_MS + 1) })).toBeNull();
  });
});
