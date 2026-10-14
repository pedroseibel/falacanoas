import { describe, expect, test } from "bun:test";
import { fullyRead, readProtocols, replyBody, resumoNumberIn } from "./protocol-reply";

const codes = ["C3VT4", "M4XRT", "7KHAP"];

/** The resumo as Gmail quotes it under a reply: every code, and the example protocol. */
const quoted = [
  "Em seg., 13 de out. de 2026 às 18:00, Fala, Canoas <resumo@falacanoas.com.br>",
  "escreveu:",
  "> Resumo diário nº 0012/2026",
  "> C3VT4 Buraco na rua · Centro",
  "> M4XRT Poste apagado · Niterói",
  "> Responda com o número de protocolo de cada registro (por exemplo: C3VT4, protocolo 2026/000000).",
].join("\n");

describe("the reply's own text", () => {
  test("drops what it quotes, in Gmail's and Outlook's forms", () => {
    expect(replyBody(`Protocolo 2026/004512 para todos.\n\n${quoted}`)).toBe("Protocolo 2026/004512 para todos.");
    const outlook = "Segue.\r\nDe: Fala, Canoas <resumo@falacanoas.com.br>\r\nEnviado: segunda-feira\r\nC3VT4";
    expect(replyBody(outlook)).toBe("Segue.");
    expect(replyBody("Ok.\n-----Mensagem original-----\nC3VT4")).toBe("Ok.");
    expect(replyBody("> C3VT4\nRecebido.")).toBe("Recebido.");
  });

  test("the quoted example is never read as an answer", () => {
    const r = readProtocols(replyBody(`Recebido, obrigado.\n\n${quoted}`), codes);
    expect(r.readings).toEqual([]);
    expect(r.loose).toEqual([]);
  });
});

describe("reading protocols", () => {
  test("one per report, on the same line, in the forms the resumo suggests", () => {
    const r = readProtocols(
      [
        "Bom dia. Seguem os protocolos:",
        "C3VT4 - protocolo nº 2026/004512",
        "m4xrt: Protocolo 2026/004513.",
        "7KHAP, NUP 00106.000123/2026-45",
      ].join("\n"),
      codes,
    );
    expect(r.readings).toEqual([
      { codes: ["C3VT4"], number: "2026/004512", kind: "protocolo" },
      { codes: ["M4XRT"], number: "2026/004513", kind: "protocolo" },
      { codes: ["7KHAP"], number: "00106.000123/2026-45", kind: "nup" },
    ]);
    expect(fullyRead(r)).toBeTrue();
  });

  test("codes on one line and the protocol on the next", () => {
    const r = readProtocols("Registros C3VT4 e M4XRT\nMemorando nº 145/2026-SMSU", codes);
    expect(r.readings).toEqual([{ codes: ["C3VT4", "M4XRT"], number: "145/2026-SMSU", kind: "memorando" }]);
  });

  test("several protocols and codes on one line pair up in order", () => {
    const listed = readProtocols("C3VT4 e M4XRT: protocolos 2026/004512 e 2026/004513, em 14/10/2026.", codes);
    expect(listed.readings.map((p) => [p.codes, p.number])).toEqual([
      [["C3VT4"], "2026/004512"],
      [["M4XRT"], "2026/004513"],
    ]);
    const pairs = readProtocols("C3VT4 protocolo 2026/004512; M4XRT protocolo 2026/004513", codes);
    expect(pairs.readings.map((p) => [p.codes, p.number])).toEqual([
      [["C3VT4"], "2026/004512"],
      [["M4XRT"], "2026/004513"],
    ]);
  });

  test("one protocol and no codes covers the whole resumo", () => {
    const r = readProtocols("Prezados, sua manifestação foi registrada sob o protocolo geral 2026/0098765.", codes);
    expect(r.readings).toEqual([{ codes: "all", number: "2026/0098765", kind: "protocolo" }]);
  });

  test("a Fala.BR notice: the NUP once, labelled", () => {
    const r = readProtocols("Número Único de Protocolo (NUP): 00106.000123/2026-45\nCódigo de acesso: Xk29QpLm", codes);
    expect(r.readings).toEqual([{ codes: "all", number: "00106.000123/2026-45", kind: "nup" }]);
  });

  test("what it can't place is said, not guessed", () => {
    const r = readProtocols(
      "Protocolos 2026/1111 e 2026/2222.\nO registro 7KHAP não é de competência do município; precisamos de mais informações sobre M4XRT.",
      codes,
    );
    expect(r.readings).toEqual([]);
    expect(r.unclear).toEqual(["2026/1111", "2026/2222"]);
    expect(r.loose).toEqual(["7KHAP", "M4XRT"]);
    expect(r.asksMore).toBeTrue();
    expect(fullyRead(r)).toBeFalse();
  });

  test("codes from another resumo, words and the zeros example don't count", () => {
    const r = readProtocols("ZZZZZ carta protocolo 2026/000000 TRAVE", codes);
    expect(r).toEqual({ readings: [], unclear: [], loose: [], asksMore: false });
  });
});

test("the resumo's number in the subject", () => {
  expect(resumoNumberIn("RES: Fala, Canoas · Resumo diário nº 0012/2026 · 13/10/2026 · 3 registros")).toEqual({
    number: 12,
    year: 2026,
  });
  expect(resumoNumberIn("Re: buraco")).toBeNull();
});
