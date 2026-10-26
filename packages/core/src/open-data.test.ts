import { describe, expect, test } from "bun:test";
import { csvField, openRecord, toCsv, toFeatureCollection, type OpenRow } from "./open-data";
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
  ],
  filterGroups: [],
  neighborhoods: [{ slug: "centro", name: "Centro", threshold: 25, center: [-51.15, -29.95], bbox: [0, 0, 0, 0] }],
  geo: {
    neighborhoods: { type: "FeatureCollection", features: [] },
    boundary: { type: "FeatureCollection", features: [] },
  },
  branding: { name: "Fala, Teste", domain: "fala.example" },
  emergency: { civilDefense: { display: "(51) 98255-0805", tel: "51982550805" }, fire: { display: "193", tel: "193" } },
};

const row: OpenRow = {
  codigo: "7K3QF",
  tipo: "occurrence",
  categoria: "buraco",
  bairro: "centro",
  lng: -51.1795,
  lat: -29.9175,
  registrado_em: new Date("2026-09-01T15:00:00Z"),
  enviado_em: new Date("2026-09-01T21:00:00Z"),
  protocolo: null,
  protocolado_em: null,
  estado_comunidade: "confirmed",
  estado_orgao: null,
  orgao_que_respondeu: null,
  orgao_atualizou_em: null,
  fechado_em: null,
  confirmacoes: 4,
  atualizado_em: new Date("2026-10-10T12:00:00Z"),
};

describe("openRecord", () => {
  test("names from the instance, the page, and the public clock's days", () => {
    const r = openRecord(row, muni, new Date("2026-10-12T15:00:00Z"));
    expect(r).toMatchObject({
      categoria_nome: "Buraco na rua",
      orgao_responsavel: "Secretaria de Obras",
      bairro_nome: "Centro",
      enviado_em: "2026-09-01T21:00:00.000Z",
      dias: 41,
      pagina: "https://fala.example/o/7K3QF",
    });
  });
  test("not sent yet: zero days; closed: the days stop at the close", () => {
    const now = new Date("2026-10-12T15:00:00Z");
    expect(openRecord({ ...row, enviado_em: null }, muni, now).dias).toBe(0);
    expect(openRecord({ ...row, fechado_em: new Date("2026-09-11T15:00:00Z") }, muni, now).dias).toBe(10);
  });
});

test("GeoJSON: a point where there is one, null geometry for a bairro-wide pin", () => {
  const now = new Date("2026-10-12T15:00:00Z");
  const fc = toFeatureCollection([
    openRecord(row, muni, now),
    openRecord({ ...row, codigo: "BAIRR", lng: null, lat: null }, muni, now),
  ]);
  expect(fc.features[0]?.geometry).toEqual({ type: "Point", coordinates: [-51.1795, -29.9175] });
  expect(fc.features[0]?.properties).not.toHaveProperty("lng");
  expect(fc.features[1]?.geometry).toBeNull();
  expect(fc.features[1]?.id).toBe("BAIRR");
});

describe("CSV", () => {
  test("quotes what needs quoting, and leaves numbers and empties alone", () => {
    expect(csvField('Secretaria "de" Obras, Canoas')).toBe('"Secretaria ""de"" Obras, Canoas"');
    expect(csvField(-29.9175)).toBe("-29.9175");
    expect(csvField(null)).toBe("");
  });
  test("text a spreadsheet would run as a formula is defused", () => {
    expect(csvField('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvField("+55 51")).toBe("'+55 51");
    expect(csvField("@soma")).toBe("'@soma");
  });
  test("a header line, the columns in order, CRLF line ends", () => {
    expect(toCsv([{ a: 1, b: "x" }], ["b", "a"])).toBe("b,a\r\nx,1\r\n");
  });
});
