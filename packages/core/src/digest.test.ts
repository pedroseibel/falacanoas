import { describe, expect, test } from "bun:test";
import { NO_AGENCY, buildDigest, digestDocument, digestible, type DigestItem } from "./digest";
import type { Municipality } from "./types";

const muni: Municipality = {
  slug: "teste",
  name: "Teste",
  state: "RS",
  country: "BR",
  locale: "pt-BR",
  timezone: "America/Sao_Paulo",
  center: [-51.15, -29.95],
  bounds: [
    [-51.2, -30],
    [-51.1, -29.9],
  ],
  deadlineDays: 30,
  digestHour: 18,
  categories: [
    { key: "buraco", label: "Buraco na rua", group: "ruas", agency: "Secretaria de Obras", kind: "occurrence" },
    { key: "poste", label: "Poste apagado", group: "luz", agency: "Iluminação Pública", kind: "occurrence" },
  ],
  filterGroups: [],
  neighborhoods: [
    { slug: "centro", name: "Centro", threshold: 25, center: [-51.15, -29.95], bbox: [0, 0, 0, 0] },
    { slug: "fatima", name: "Fátima", threshold: 25, center: [-51.15, -29.95], bbox: [0, 0, 0, 0] },
  ],
  geo: {
    neighborhoods: { type: "FeatureCollection", features: [] },
    boundary: { type: "FeatureCollection", features: [] },
  },
  branding: { name: "Fala, Teste", domain: "fala.example" },
  emergency: { civilDefense: { display: "(51) 98255-0805", tel: "51982550805" }, fire: { display: "193", tel: "193" } },
};

const item = (id: string, over: Partial<DigestItem> = {}): DigestItem => ({
  id,
  kind: "occurrence",
  category: "buraco",
  title: "Buraco fundo na faixa da direita",
  text: "Buraco fundo na faixa da direita. Carros desviam pela contramão.",
  neighborhood: "centro",
  scope: { type: "point", lng: -51.15123, lat: -29.95678 },
  days: 0,
  updatedMinutesAgo: 0,
  confirmations: 0,
  followers: 0,
  updates: 0,
  photos: [{ src: "/api/fotos/abc.webp", takenAt: "", by: "vizinha" }],
  visibility: "pseudonymous",
  author: "vizinha-secreta",
  community: "reported",
  official: null,
  createdAt: "2026-10-12T17:20:00Z",
  ...over,
});

const sentAt = new Date("2026-10-12T21:00:00Z"); // 18h in Canoas

describe("buildDigest", () => {
  const d = buildDigest(
    [
      item("AAAAA", { confirmations: 2 }),
      item("BBBBB", { category: "poste", title: "Poste apagado na esquina", text: "" }),
      item("DEMO1", { demo: true }),
    ],
    muni,
    sentAt,
  );

  test("the subject names the instance, the resumo's number, the local date and the count, without demo items", () => {
    expect(d.subject).toBe("Fala, Teste · Resumo diário nº 0001/2026 · 12/10/2026 · 2 registros");
    // In the document's order: Iluminação Pública comes before Secretaria de Obras.
    expect(d.itemIds).toEqual(["BBBBB", "AAAAA"]);
    expect(d.text).not.toContain("DEMO1");
  });

  test("grouped by the body responsible, each entry with its code, place, photos and link", () => {
    expect(d.text.indexOf("Iluminação Pública · 1 registro")).toBeLessThan(
      d.text.indexOf("Secretaria de Obras · 1 registro"),
    );
    expect(d.text).toContain("Buraco na rua · Centro · código AAAAA");
    expect(d.text).toContain(
      "Local: -29.95678, -51.15123 · https://www.openstreetmap.org/?mlat=-29.95678&mlon=-51.15123",
    );
    expect(d.text).toContain("Foto 1: https://fala.example/api/fotos/abc.webp");
    expect(d.text).toContain("Registrado em 12/10 às 14:20 · 2 vizinhos confirmaram");
    expect(d.text).toContain("https://fala.example/o/AAAAA");
  });

  test("never who reported", () => {
    expect(d.text).not.toContain("vizinha-secreta");
    expect(d.text).toContain("Quem registrou não é identificado neste resumo.");
  });
});

describe("digestDocument", () => {
  const doc = digestDocument(
    [
      item("OBRA2", { neighborhood: "fatima", createdAt: "2026-10-12T12:00:00Z" }),
      item("LUZ01", { category: "poste" }),
      item("OBRA1", { neighborhood: "centro", createdAt: "2026-10-12T15:00:00Z" }),
      item("SEMOR", { category: "desconhecida" }),
      item("LUGAR", { scope: { type: "place", label: "Praça da matriz", lng: -51.1, lat: -29.9 } }),
    ],
    muni,
    sentAt,
    287,
  );
  const order = doc.sections.map((s) => [s.agency, s.entries.map((e) => `${e.n}:${e.id}`)]);

  test("bodies alphabetically, the unrouted bucket last; by bairro inside each; numbers run on", () => {
    expect(order).toEqual([
      ["Iluminação Pública", ["1:LUZ01"]],
      // Centro before Fátima; inside Centro, by time (OBRA1 at 12h, LUGAR at 14h20).
      ["Secretaria de Obras", ["2:OBRA1", "3:LUGAR", "4:OBRA2"]],
      [NO_AGENCY, ["5:SEMOR"]],
    ]);
    expect(doc.total).toBe(5);
  });

  test("numbered like an ofício, dated in words", () => {
    expect(doc.number).toBe("0287/2026");
    expect(doc.dateLine).toBe("Teste, 12 de outubro de 2026.");
    expect(doc.sentAt).toBe("12/10/2026 às 18:00");
    expect(digestDocument([], muni, new Date("2026-11-01T21:00:00Z"), 1).dateLine).toBe(
      "Teste, 1º de novembro de 2026.",
    );
  });

  test("an entry carries its place, point, photos and page; text only when it adds to the title", () => {
    const lugar = doc.sections[1]?.entries[1];
    expect(lugar?.place).toBe("Praça da matriz");
    expect(lugar?.point).toEqual({ lng: -51.1, lat: -29.9 });
    expect(lugar?.photos).toEqual(["https://fala.example/api/fotos/abc.webp"]);
    expect(lugar?.url).toBe("https://fala.example/o/LUGAR");
    expect(
      digestDocument([item("SAME", { text: "Buraco fundo na faixa da direita" })], muni, sentAt, 1).sections[0]
        ?.entries[0]?.text,
    ).toBeNull();
  });
});

describe("the e-mail text", () => {
  const items = [item("AAAAA"), item("BBBBB"), item("CCCCC", { category: "poste" })];
  test("opens with the number, the day's totals and each body's range", () => {
    const { text } = buildDigest(items, muni, sentAt, { sequence: 3 });
    expect(text.startsWith("Resumo diário nº 0003/2026\nTeste, 12 de outubro de 2026.")).toBeTrue();
    expect(text).toContain("Hoje: 3 registros novos, para 2 órgãos.");
    expect(text).toContain("- Iluminação Pública: 1 registro (nº 1)");
    expect(text).toContain("- Secretaria de Obras: 2 registros (nº 2 a 3)");
  });
  test("the looked-up address and the resident's reference help the crew find the spot", () => {
    const withPlace = [item("AAAAA", { address: "Rua Tiradentes, 123", reference: "em frente à escola" })];
    const { text } = buildDigest(withPlace, muni, sentAt);
    expect(text).toContain("   Endereço aproximado: Rua Tiradentes, 123\n   Ponto de referência: em frente à escola");
    expect(buildDigest([item("BBBBB")], muni, sentAt).text).not.toContain("Endereço");
  });
  test("a street that floods carries what the resident saw and the day's rain, with its source", () => {
    const flooded = item("CCCCC", {
      flooding: { cause: "bombas", raining: true },
      rain: {
        gauge: 7325,
        name: "Mathias Velho",
        agency: "Cemaden",
        page: "https://cemaden.invalid/7325",
        meters: 1234,
        mm: 69.2,
        until: "2026-06-17T23:10:00Z",
      },
    });
    const { text } = buildDigest([flooded], muni, sentAt);
    expect(text).toContain("   Segundo quem registrou: o que viu: casa de bombas parada; na hora: estava chovendo.");
    expect(text).toContain(
      "   Chuva: Nesse dia, 69,2 mm em 24 h no pluviômetro Mathias Velho, a 1,2 km. Fonte: Cemaden, pluviômetro automático: o maior acumulado de 24 h medido nesse dia, às 20:10.",
    );
    expect(buildDigest([item("DDDDD")], muni, sentAt).text).not.toContain("Chuva:");
  });
  test("mentions the PDF only when it's attached", () => {
    expect(buildDigest(items, muni, sentAt, { attachment: true }).text).toContain("Em anexo, o mesmo resumo em PDF");
    expect(buildDigest(items, muni, sentAt).text).not.toContain("Em anexo");
  });
});

test("digestible: published, real occurrences not sent yet", () => {
  expect(digestible(item("A"))).toBeTrue();
  expect(digestible({ ...item("A"), sentAt: "2026-10-11T21:00:00Z" })).toBeFalse();
  expect(digestible(item("A", { demo: true }))).toBeFalse();
  expect(digestible(item("A", { moderation: "pending" }))).toBeFalse();
  expect(digestible(item("A", { kind: "public_issue" }))).toBeFalse();
});
