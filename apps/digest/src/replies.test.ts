import { describe, expect, test } from "bun:test";
import { dmarcPassed, readMail, senderName, takeReply, type ReplyStore, type Senders } from "./replies";

const senders: Senders = {
  to: ["transparenciaouvidoria@canoas.rs.gov.br"],
  cc: ["atendimento.cidadao@canoas.rs.gov.br"],
  names: { to: "Ouvidoria do Município de Canoas", cc: ["Central de Atendimento ao Cidadão (CAC)"] },
};

/** A reply as Gmail sends it, quoting the resumo under "escreveu:". */
function eml({
  from = "Ouvidoria <transparenciaouvidoria@canoas.rs.gov.br>",
  auth = "mx.cloudflare.net; dmarc=pass header.from=canoas.rs.gov.br; spf=pass",
  inReplyTo = "<2026-10-13T21-00-00-000Z-ab12cd34@resumo.invalid>",
  subject = "Re: Fala, Canoas · Resumo diário nº 0012/2026 · 13/10/2026 · 3 registros",
  body = "Bom dia.\nC3VT4 - protocolo 2026/004512\nM4XRT - protocolo 2026/004513",
} = {}) {
  return [
    ...(auth ? [`Authentication-Results: ${auth}`] : []),
    `From: ${from}`,
    "To: Fala, Canoas <resumo@falacanoas.com.br>",
    `Subject: ${subject}`,
    "Message-ID: <CAF+resposta-1@mail.gmail.com>",
    ...(inReplyTo ? [`In-Reply-To: ${inReplyTo}`] : []),
    "Date: Tue, 14 Oct 2026 10:12:00 -0300",
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
    "",
    "Em seg., 13 de out. de 2026 às 18:00, Fala, Canoas <resumo@falacanoas.com.br> escreveu:",
    "> C3VT4 Buraco na rua · M4XRT Poste apagado · 7KHAP Lixo",
    "> (por exemplo: C3VT4, protocolo 2026/000000)",
  ].join("\r\n");
}

function fakeStore(
  resumo: { id: string; itemIds: string[] } | null = { id: "d1", itemIds: ["C3VT4", "M4XRT", "7KHAP"] },
) {
  const protocols = new Map<string, string>([["7KHAP", "2026/000777"]]);
  const recorded: Parameters<ReplyStore["record"]>[0][] = [];
  const dates: Date[] = [];
  const store: ReplyStore = {
    seen: async (id) => recorded.some((r) => r.mail.messageId === id),
    resumoFor: async (refs, number) =>
      resumo && (refs.includes("2026-10-13T21-00-00-000Z-ab12cd34@resumo.invalid") || number?.number === 12)
        ? resumo
        : null,
    recentCodes: async () => ["C3VT4", "M4XRT", "7KHAP"],
    protocol: async ({ ids, number, keep, at }) => {
      dates.push(at);
      const written = ids.filter((id) => protocols.get(id) !== number && !(keep && protocols.has(id)));
      for (const id of written) protocols.set(id, number);
      return written;
    },
    record: async (input) => {
      recorded.push(input);
      return `r${recorded.length}`;
    },
  };
  return { store, protocols, recorded, dates };
}

describe("a reply to the resumo", () => {
  test("from the Ouvidoria, authenticated and threaded: the protocols go on the reports", async () => {
    const { store, protocols } = fakeStore();
    const outcome = await takeReply(store, senders, await readMail(eml(), "mx.cloudflare.net"));
    expect(outcome).toMatchObject({ kind: "recorded", status: "applied", applied: ["C3VT4", "M4XRT"] });
    expect(protocols.get("C3VT4")).toBe("2026/004512");
    expect(protocols.get("7KHAP")).toBe("2026/000777");
  });

  test("a protocol is never dated after the reply arrived", async () => {
    const { store, dates } = fakeStore();
    const now = new Date("2026-10-14T09:00:00-03:00");
    await takeReply(store, senders, await readMail(eml(), "mx.cloudflare.net"), { now });
    expect(dates).toEqual([now, now]);
  });

  test("the same reply twice is read once", async () => {
    const { store } = fakeStore();
    const mail = await readMail(eml(), "mx.cloudflare.net");
    await takeReply(store, senders, mail);
    expect(await takeReply(store, senders, mail)).toEqual({ kind: "repeated" });
  });

  test("not authenticated, or from elsewhere: nothing applied, a person reads it", async () => {
    for (const raw of [
      eml({ auth: "" }),
      eml({ auth: "mx.outro.example; dmarc=pass header.from=canoas.rs.gov.br" }),
      eml({ auth: "mx.cloudflare.net; dmarc=fail header.from=canoas.rs.gov.br" }),
      eml({ from: "golpe@exemplo.com", auth: "mx.cloudflare.net; dmarc=pass header.from=exemplo.com" }),
    ]) {
      const { store, protocols } = fakeStore();
      // oxlint-disable-next-line no-await-in-loop
      const outcome = await takeReply(store, senders, await readMail(raw, "mx.cloudflare.net"));
      expect(outcome).toMatchObject({ status: "review", applied: [] });
      expect(protocols.has("C3VT4")).toBeFalse();
    }
  });

  test("handed in by the operator, it counts as authenticated", async () => {
    const { store } = fakeStore();
    const outcome = await takeReply(store, senders, await readMail(eml({ auth: "" }), null), { operator: true });
    expect(outcome).toMatchObject({ status: "applied" });
  });

  test("found by the number in the subject when the thread was lost", async () => {
    const { store } = fakeStore();
    const outcome = await takeReply(store, senders, await readMail(eml({ inReplyTo: "" }), "mx.cloudflare.net"));
    expect(outcome).toMatchObject({ status: "applied" });
  });

  test("no resumo found: suggestions only", async () => {
    const { store, recorded } = fakeStore(null);
    const outcome = await takeReply(store, senders, await readMail(eml(), "mx.cloudflare.net"));
    expect(outcome).toMatchObject({ status: "review", applied: [] });
    expect(recorded[0]?.reading.readings.map((r) => r.applied)).toEqual([false, false]);
  });

  test("one protocol for the whole resumo leaves a report's own protocol alone", async () => {
    const { store, protocols } = fakeStore();
    const outcome = await takeReply(
      store,
      senders,
      await readMail(eml({ body: "Registrado sob o protocolo geral 2026/0098765." }), "mx.cloudflare.net"),
    );
    expect(outcome).toMatchObject({ status: "applied", applied: ["C3VT4", "M4XRT"] });
    expect(protocols.get("7KHAP")).toBe("2026/000777");
  });

  test("a request for more information always goes to a person", async () => {
    const { store } = fakeStore();
    const outcome = await takeReply(
      store,
      senders,
      await readMail(
        eml({ body: "C3VT4 - protocolo 2026/004512\nPrecisamos de mais informações sobre o local." }),
        "mx.cloudflare.net",
      ),
    );
    expect(outcome).toMatchObject({ status: "review", applied: ["C3VT4"] });
  });
});

describe("pieces", () => {
  test("only the topmost Authentication-Results counts", () => {
    const forged = [
      { key: "authentication-results", value: "mx.cloudflare.net; dmarc=fail header.from=canoas.rs.gov.br" },
      { key: "authentication-results", value: "mx.cloudflare.net; dmarc=pass header.from=canoas.rs.gov.br" },
    ];
    expect(dmarcPassed(forged, "mx.cloudflare.net", "canoas.rs.gov.br")).toBeFalse();
    expect(dmarcPassed(forged.slice(1), "mx.cloudflare.net", "canoas.rs.gov.br")).toBeTrue();
    expect(dmarcPassed(forged.slice(1), null, "canoas.rs.gov.br")).toBeFalse();
  });

  test("the history names the body that answered, never a person", () => {
    expect(senderName("Fulana <transparenciaouvidoria@canoas.rs.gov.br>", senders)).toBe(
      "A Ouvidoria do Município de Canoas",
    );
    expect(senderName("atendimento.cidadao@canoas.rs.gov.br", senders)).toBe(
      "A Central de Atendimento ao Cidadão (CAC)",
    );
    expect(senderName("obras@canoas.rs.gov.br", senders)).toBe("A Prefeitura");
  });

  test("an HTML-only reply is read as text", async () => {
    const raw = [
      "From: transparenciaouvidoria@canoas.rs.gov.br",
      "Message-ID: <h1@x>",
      "Content-Type: text/html; charset=utf-8",
      "",
      "<div>C3VT4 &ndash; protocolo 2026/004512<br>M4XRT: protocolo 2026/004513</div><div class=gmail_quote>Em seg., 13 de out. de 2026, Fala escreveu:<blockquote>7KHAP</blockquote></div>",
    ].join("\r\n");
    const mail = await readMail(raw, null);
    expect(mail.text).toContain("C3VT4");
    expect(mail.refs).toEqual([]);
  });
});
