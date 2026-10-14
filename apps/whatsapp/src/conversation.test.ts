import { describe, expect, test } from "bun:test";
import { canoas } from "@fala/instance-canoas";
import type { ReportDraft, WaMessage } from "@fala/core";
import { conversation, type Reports, type Sender, type SignupStore } from "./conversation";

const centro = canoas.neighborhoods.find((n) => n.slug === "centro");

/** One stored sign-up, under the number as it was typed on the landing page (with the ninth digit). */
function fakeStore(signup: { contact: string; code: string; confirmed: boolean } | null) {
  let row = signup && { id: "s1", neighborhood: "centro", ...signup };
  const store: SignupStore = {
    find: async (numbers) => (row && numbers.includes(row.contact) ? row : null),
    confirm: async () => {
      if (row) row = { ...row, confirmed: true };
      return 7;
    },
    leave: async (numbers) => {
      if (!row || !numbers.includes(row.contact)) return null;
      row = null;
      return "centro";
    },
  };
  return { store, row: () => row };
}

function fakeSender(fail = false) {
  const sent: { to: string; text: string }[] = [];
  const sender: Sender = {
    name: "teste",
    send: async (to, text) => {
      if (fail) throw new Error("caiu");
      sent.push({ to, text });
    },
  };
  return { sender, sent };
}

const signup = { contact: "5551988887777", code: "K7HA", confirmed: false };

describe("conversation", () => {
  test("the pre-filled code confirms, and the reply says what's missing in the bairro", async () => {
    const { store, row } = fakeStore(signup);
    const { sender, sent } = fakeSender();
    const result = await conversation({ store, sender, muni: canoas })({
      from: "5551988887777",
      kind: "text",
      text: "CONFIRMAR K7HA",
    });
    expect(result.outcome).toEqual({ kind: "confirmed", neighborhood: "centro", confirmedInBairro: 7 });
    expect(row()?.confirmed).toBeTrue();
    expect(sent).toEqual([{ to: "5551988887777", text: expect.stringContaining(`fila de ${centro?.name}`) }]);
  });

  test("a number arriving without the ninth digit still finds its sign-up, and the reply goes back to it", async () => {
    const { store } = fakeStore(signup);
    const { sender, sent } = fakeSender();
    const result = await conversation({ store, sender, muni: canoas })({
      from: "555188887777",
      kind: "text",
      text: "confirmar k7ha",
    });
    expect(result.outcome.kind).toBe("confirmed");
    expect(sent[0]?.to).toBe("555188887777");
  });

  test("a wrong code, or no sign-up, confirms nothing", async () => {
    const { store, row } = fakeStore(signup);
    const { sender } = fakeSender();
    const handle = conversation({ store, sender, muni: canoas });
    expect((await handle({ from: "5551988887777", kind: "text", text: "CONFIRMAR AAAA" })).outcome).toEqual({
      kind: "wrong-code",
    });
    expect((await handle({ from: "5551900001111", kind: "text", text: "CONFIRMAR K7HA" })).outcome).toEqual({
      kind: "unknown",
    });
    expect(row()?.confirmed).toBeFalse();
  });

  test("SAIR deletes the sign-up", async () => {
    const { store, row } = fakeStore({ ...signup, confirmed: true });
    const { sender, sent } = fakeSender();
    const handle = conversation({ store, sender, muni: canoas });
    expect((await handle({ from: "5551988887777", kind: "text", text: "SAIR" })).outcome).toEqual({
      kind: "left",
      neighborhood: "centro",
    });
    expect(row()).toBeNull();
    expect((await handle({ from: "5551988887777", kind: "text", text: "sair" })).outcome).toEqual({
      kind: "nothing-to-leave",
    });
    expect(sent).toHaveLength(2);
  });

  test("anything else is answered once a day per number", async () => {
    const { store } = fakeStore(null);
    const { sender, sent } = fakeSender();
    const handle = conversation({ store, sender, muni: canoas });
    const t0 = Date.parse("2026-10-12T12:00:00Z");
    expect((await handle({ from: "5551900001111", kind: "text", text: "oi" }, t0)).reply).toContain(
      "só confirma inscrições",
    );
    expect((await handle({ from: "5551900001111", kind: "text", text: "oi?" }, t0 + 60_000)).reply).toBeNull();
    expect((await handle({ from: "5551900001111", kind: "text", text: "oi" }, t0 + 86_400_000)).reply).not.toBeNull();
    expect(sent).toHaveLength(2);
  });

  test("a reply that fails doesn't undo the confirmation", async () => {
    const { store, row } = fakeStore(signup);
    const { sender } = fakeSender(true);
    const result = await conversation({ store, sender, muni: canoas })({
      from: "5551988887777",
      kind: "text",
      text: "CONFIRMAR K7HA",
    });
    expect(result.sent).toBeFalse();
    expect(row()?.confirmed).toBeTrue();
  });
});

/** The site, as the report flow sees it: an account per number, and what was asked of it. */
function fakeSite(
  opts: { account?: Awaited<ReturnType<Reports["account"]>>; duplicate?: boolean; down?: boolean } = {},
) {
  const calls: { kind: string; draft?: ReportDraft; photos?: number; visibility?: string; itemId?: string }[] = [];
  const site: Reports = {
    account: async () => opts.account ?? { ok: true, nick: "vizinha" },
    similar: async (_from, draft) => {
      calls.push({ kind: "similar", draft });
      return opts.duplicate ? { id: "7K3QF", meters: 22, title: "Buraco na Rua Tiradentes" } : null;
    },
    publish: async (_from, draft, visibility, photos) => {
      if (opts.down) throw new Error("fora do ar");
      calls.push({ kind: "publish", draft, visibility, photos: photos.length });
      return { kind: "published", id: "M4XRT", digest: "hoje", held: false };
    },
    join: async (_from, itemId, visibility, photos) => {
      calls.push({ kind: "join", itemId, visibility, photos: photos.length });
      return { kind: "joined", id: itemId };
    },
  };
  return { site, calls };
}

const bytes = new Uint8Array([0xff, 0xd8, 0xff]);
const praca = canoas.neighborhoods.find((n) => n.slug === "centro")?.center ?? canoas.center;
const occurrence = canoas.categories.findIndex((c) => c.kind === "occurrence") + 1;

describe("registering a problem", () => {
  const from = "5551988887777";
  const at = Date.parse("2026-10-13T12:00:00Z");

  function setup(opts: Parameters<typeof fakeSite>[0] = {}, stored: Parameters<typeof fakeStore>[0] = null) {
    const { store, row } = fakeStore(stored);
    const { sender, sent } = fakeSender();
    const { site, calls } = fakeSite(opts);
    const handle = conversation({ store, sender, muni: canoas, reports: { site, photos: async () => bytes } });
    let i = 0;
    const say = (m: WaMessage) => handle({ from, ...m }, at + i++ * 1000);
    return { say, sent, calls, row };
  }

  test("photos, place, type, words, then published with the photos", async () => {
    const { say, calls } = setup();
    await Promise.all([say({ kind: "image", mediaId: "m1" }), say({ kind: "image", mediaId: "m2" })]);
    await say({ kind: "location", lat: praca[1], lng: praca[0] });
    await say({ kind: "text", text: String(occurrence) });
    await say({ kind: "text", text: "Cratera na frente da escola" });
    const done = await say({ kind: "text", text: "SIM" });
    expect(calls.map((c) => c.kind)).toEqual(["similar", "publish"]);
    expect(calls[1]).toMatchObject({ visibility: "pseudonymous", photos: 2 });
    expect(calls[1]?.draft?.text).toBe("Cratera na frente da escola");
    expect(done.reply).toContain("M4XRT");
  });

  test("a similar problem nearby is offered, and 1 adds the photo to it", async () => {
    const { say, calls } = setup({ duplicate: true });
    await say({ kind: "image", mediaId: "m1" });
    await say({ kind: "location", lat: praca[1], lng: praca[0] });
    await say({ kind: "text", text: String(occurrence) });
    expect((await say({ kind: "text", text: "PULAR" })).reply).toContain("7K3QF");
    await say({ kind: "text", text: "1" });
    await say({ kind: "text", text: "anônimo" });
    expect(calls.at(-1)).toEqual({ kind: "join", itemId: "7K3QF", visibility: "anonymous", photos: 1 });
  });

  test("a number without an account is told where to make one, once for photos sent together", async () => {
    const { say, sent } = setup({ account: { ok: false, reason: "unlinked" } });
    await Promise.all([say({ kind: "image", mediaId: "m1" }), say({ kind: "image", mediaId: "m2" })]);
    expect(sent).toHaveLength(1);
    expect(sent[0]?.text).toContain("/entrar");
  });

  test("CANCELAR ends the report and leaves the queue sign-up alone; outside a report it still leaves", async () => {
    const { say, row } = setup({}, { ...signup, confirmed: true });
    await say({ kind: "image", mediaId: "m1" });
    expect((await say({ kind: "text", text: "CANCELAR" })).reply).toContain("Registro cancelado");
    expect(row()).not.toBeNull();
    expect((await say({ kind: "text", text: "CANCELAR" })).outcome).toEqual({ kind: "left", neighborhood: "centro" });
  });

  test("CONFIRMAR XXXX still confirms the sign-up in the middle of a report", async () => {
    const { say, row } = setup({}, signup);
    await say({ kind: "image", mediaId: "m1" });
    expect((await say({ kind: "text", text: "CONFIRMAR K7HA" })).outcome.kind).toBe("confirmed");
    expect(row()?.confirmed).toBeTrue();
  });

  test("when the site is down at publishing, SIM can try again", async () => {
    const { say } = setup({ down: true });
    await say({ kind: "image", mediaId: "m1" });
    await say({ kind: "location", lat: praca[1], lng: praca[0] });
    await say({ kind: "text", text: String(occurrence) });
    await say({ kind: "text", text: "PULAR" });
    expect((await say({ kind: "text", text: "SIM" })).reply).toContain("Responda SIM de novo");
    expect((await say({ kind: "text", text: "SIM" })).reply).toContain("Responda SIM de novo");
  });

  test("without registering, a photo gets the note on what the number does", async () => {
    const { store } = fakeStore(null);
    const { sender, sent } = fakeSender();
    await conversation({ store, sender, muni: canoas })({ from, kind: "image", mediaId: "m1" });
    expect(sent[0]?.text).toContain("só confirma inscrições");
  });
});
