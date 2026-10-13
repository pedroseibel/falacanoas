import { describe, expect, test } from "bun:test";
import { canoas } from "@fala/instance-canoas";
import { conversation, type Sender, type SignupStore } from "./conversation";

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
      text: "confirmar k7ha",
    });
    expect(result.outcome.kind).toBe("confirmed");
    expect(sent[0]?.to).toBe("555188887777");
  });

  test("a wrong code, or no sign-up, confirms nothing", async () => {
    const { store, row } = fakeStore(signup);
    const { sender } = fakeSender();
    const handle = conversation({ store, sender, muni: canoas });
    expect((await handle({ from: "5551988887777", text: "CONFIRMAR AAAA" })).outcome).toEqual({ kind: "wrong-code" });
    expect((await handle({ from: "5551900001111", text: "CONFIRMAR K7HA" })).outcome).toEqual({ kind: "unknown" });
    expect(row()?.confirmed).toBeFalse();
  });

  test("SAIR deletes the sign-up", async () => {
    const { store, row } = fakeStore({ ...signup, confirmed: true });
    const { sender, sent } = fakeSender();
    const handle = conversation({ store, sender, muni: canoas });
    expect((await handle({ from: "5551988887777", text: "SAIR" })).outcome).toEqual({
      kind: "left",
      neighborhood: "centro",
    });
    expect(row()).toBeNull();
    expect((await handle({ from: "5551988887777", text: "sair" })).outcome).toEqual({ kind: "nothing-to-leave" });
    expect(sent).toHaveLength(2);
  });

  test("anything else is answered once a day per number", async () => {
    const { store } = fakeStore(null);
    const { sender, sent } = fakeSender();
    const handle = conversation({ store, sender, muni: canoas });
    const t0 = Date.parse("2026-10-12T12:00:00Z");
    expect((await handle({ from: "5551900001111", text: "oi" }, t0)).reply).toContain("só confirma inscrições");
    expect((await handle({ from: "5551900001111", text: "oi?" }, t0 + 60_000)).reply).toBeNull();
    expect((await handle({ from: "5551900001111", text: "oi" }, t0 + 86_400_000)).reply).not.toBeNull();
    expect(sent).toHaveLength(2);
  });

  test("a reply that fails doesn't undo the confirmation", async () => {
    const { store, row } = fakeStore(signup);
    const { sender } = fakeSender(true);
    const result = await conversation({ store, sender, muni: canoas })({
      from: "5551988887777",
      text: "CONFIRMAR K7HA",
    });
    expect(result.sent).toBeFalse();
    expect(row()?.confirmed).toBeTrue();
  });
});
