import { describe, expect, test } from "bun:test";
import { canoas } from "@fala/instance-canoas";
import type { DigestItem } from "@fala/core";
import { pdfName, runDigest, type DigestStore, type Mail, type Outbox } from "./run";

const item = (id: string, over: Partial<DigestItem> = {}): DigestItem => ({
  id,
  category: canoas.categories[0]?.key ?? "buraco",
  title: "Buraco fundo na esquina",
  text: "",
  neighborhood: null,
  scope: { type: "point", lng: -51.18, lat: -29.91 },
  confirmations: 0,
  photos: [],
  createdAt: "2026-10-12T15:00:00.000Z",
  ...over,
});

function fakeStore(pending: DigestItem[], locked = false) {
  const marked: Parameters<DigestStore["markSent"]>[0][] = [];
  const store: DigestStore = {
    pending: async () => pending,
    nextNumber: async () => 288,
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
        number: 288,
        pdfSha256: null,
      }),
    ]);
    expect(sent[0]?.attachments).toEqual([]);
    expect(sent[0]?.subject).toContain("Resumo diário nº 0288/2026");
  });

  test("with a PDF: attached under its name, mentioned in the text, its hash on the record", async () => {
    const { store, marked } = fakeStore([item("AAAA1")]);
    const { outbox, sent } = fakeOutbox();
    const pdf = new TextEncoder().encode("%PDF-1.7 teste");
    const result = await runDigest({ store, outbox, muni: canoas, recipients, pdf: async () => pdf }, now);
    expect(result).toMatchObject({ ok: true, sent: 1, pdf: { bytes: pdf.length } });
    expect(sent[0]?.attachments).toEqual([
      { filename: "Resumo-diario-0288-2026-Fala-Canoas-2026-10-12.pdf", contentType: "application/pdf", content: pdf },
    ]);
    expect(sent[0]?.text).toContain("Em anexo, o mesmo resumo em PDF");
    expect(marked[0]?.pdfSha256).toBe(new Bun.CryptoHasher("sha256").update(pdf).digest("hex"));
  });

  test("a PDF that fails to build doesn't hold the reports back: the text goes alone, the run says why", async () => {
    const { store, marked } = fakeStore([item("AAAA1")]);
    const { outbox, sent } = fakeOutbox();
    const result = await runDigest(
      {
        store,
        outbox,
        muni: canoas,
        recipients,
        pdf: async () => {
          throw new Error("typst caiu");
        },
      },
      now,
    );
    expect(result).toMatchObject({ ok: true, sent: 1, pdf: { error: "Error: typst caiu" } });
    expect(sent[0]?.attachments).toEqual([]);
    expect(sent[0]?.text).not.toContain("Em anexo");
    expect(marked[0]?.pdfSha256).toBeNull();
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

test("pdfName: type, number, sender and day, in plain ASCII", () => {
  expect(
    pdfName({
      number: "0007/2026",
      day: "01/11/2026",
      sender: "Fala, Canoas",
      dateLine: "",
      sentAt: "",
      site: "",
      municipality: "",
      deadlineDays: 30,
      total: 0,
      sections: [],
    }),
  ).toBe("Resumo-diario-0007-2026-Fala-Canoas-2026-11-01.pdf");
});
