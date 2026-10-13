import { describe, expect, test } from "bun:test";
import { canoas } from "@fala/instance-canoas";
import type { DigestItem } from "@fala/core";
import { runDigest, type DigestStore, type Mail, type Outbox } from "./run";

const item = (id: string, over: Partial<DigestItem> = {}): DigestItem => ({
  id,
  kind: "occurrence",
  category: canoas.categories[0]?.key ?? "buraco",
  title: "Buraco fundo na esquina",
  text: "",
  neighborhood: null,
  scope: { type: "point", lng: -51.18, lat: -29.91 },
  days: 0,
  updatedMinutesAgo: 0,
  confirmations: 0,
  followers: 0,
  updates: 0,
  photos: [],
  visibility: "anonymous",
  author: null,
  community: "reported",
  official: null,
  createdAt: "2026-10-12T15:00:00.000Z",
  ...over,
});

function fakeStore(pending: DigestItem[], locked = false) {
  const marked: Parameters<DigestStore["markSent"]>[0][] = [];
  const store: DigestStore = {
    pending: async () => pending,
    markSent: async (d) => {
      marked.push(d);
    },
    exclusive: async (f) => (locked ? null : f()),
  };
  return { store, marked };
}

function fakeOutbox(fail = false) {
  const sent: Mail[] = [];
  const outbox: Outbox = {
    name: "teste",
    send: async (mail) => {
      if (fail) throw new Error("caiu");
      sent.push(mail);
      return "id-1";
    },
  };
  return { outbox, sent };
}

const recipients = { from: "Fala <r@fala.invalid>", to: ["ouvidoria@x.invalid"], cc: ["cac@x.invalid"] };
const now = new Date("2026-10-12T21:00:00.000Z");

describe("runDigest", () => {
  test("sends one e-mail with every pending report, then marks them sent at that moment", async () => {
    const { store, marked } = fakeStore([item("AAAA1"), item("BBBB2")]);
    const { outbox, sent } = fakeOutbox();
    const result = await runDigest({ store, outbox, muni: canoas, recipients }, now);
    expect(result).toMatchObject({ ok: true, sent: 2 });
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toEqual(recipients.to);
    expect(sent[0]?.cc).toEqual(recipients.cc);
    expect(sent[0]?.text).toContain("AAAA1");
    expect(marked).toEqual([
      expect.objectContaining({
        sentAt: now,
        itemIds: ["AAAA1", "BBBB2"],
        recipients: ["ouvidoria@x.invalid", "cac@x.invalid"],
        transport: "teste",
        messageId: "id-1",
      }),
    ]);
  });

  test("nothing pending: no e-mail, nothing marked", async () => {
    const { store, marked } = fakeStore([]);
    const { outbox, sent } = fakeOutbox();
    expect(await runDigest({ store, outbox, muni: canoas, recipients }, now)).toEqual({
      ok: true,
      sent: 0,
      subject: null,
    });
    expect(sent).toHaveLength(0);
    expect(marked).toHaveLength(0);
  });

  test("demo or held reports never go, even if the store returned them", async () => {
    const { store, marked } = fakeStore([item("DEMO1", { demo: true }), item("HELD1", { moderation: "pending" })]);
    const { outbox, sent } = fakeOutbox();
    await runDigest({ store, outbox, muni: canoas, recipients }, now);
    expect(sent).toHaveLength(0);
    expect(marked).toHaveLength(0);
  });

  test("a failed send marks nothing, so no clock starts and the next run retries", async () => {
    const { store, marked } = fakeStore([item("AAAA1")]);
    const { outbox } = fakeOutbox(true);
    const result = await runDigest({ store, outbox, muni: canoas, recipients }, now);
    expect(result).toMatchObject({ ok: false, error: "send" });
    expect(marked).toHaveLength(0);
  });

  test("another run holding the lock: this one does nothing", async () => {
    const { store } = fakeStore([item("AAAA1")], true);
    const { outbox, sent } = fakeOutbox();
    expect(await runDigest({ store, outbox, muni: canoas, recipients }, now)).toEqual({ ok: false, error: "busy" });
    expect(sent).toHaveLength(0);
  });
});
