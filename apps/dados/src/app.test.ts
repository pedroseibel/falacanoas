import { describe, expect, test } from "bun:test";
import type { OpenEventRow, OpenRow } from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { openDataApp } from "./app";
import type { Filters } from "./store";

const row = (codigo: string, over: Partial<OpenRow> = {}): OpenRow => ({
  codigo,
  tipo: "occurrence",
  categoria: "buraco",
  bairro: "centro",
  lng: -51.1795,
  lat: -29.9175,
  registrado_em: new Date("2026-09-01T15:00:00Z"),
  enviado_em: new Date("2026-09-01T21:00:00Z"),
  protocolo: null,
  protocolado_em: null,
  estado_comunidade: "reported",
  estado_orgao: null,
  orgao_que_respondeu: null,
  orgao_atualizou_em: null,
  fechado_em: null,
  confirmacoes: 0,
  atualizado_em: new Date("2026-09-01T21:00:00Z"),
  ...over,
});

function fakeStore(rows: OpenRow[], events: OpenEventRow[] = []) {
  const asked: { filters: Filters; limit: number }[] = [];
  return {
    asked,
    store: {
      records: async (filters: Filters, limit: number) => {
        asked.push({ filters, limit });
        return rows.slice(0, limit);
      },
      record: async (codigo: string) => rows.find((r) => r.codigo === codigo) ?? null,
      events: async (codigo: string | null) => events.filter((e) => !codigo || e.codigo === codigo),
    },
  };
}

const now = () => new Date("2026-10-12T15:00:00Z");
const get = (app: ReturnType<typeof openDataApp>, path: string) => app.handle(new Request(`http://dados.test${path}`));

describe("open-data API", () => {
  test("the index says what's in, what's out, and that there's no licence yet", async () => {
    const res = await get(openDataApp(fakeStore([]).store, canoas, now), "/");
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    const body = await res.json();
    expect(body.licenca).toBeNull();
    expect(body.aviso).toContain("não podem ser reutilizados");
    expect(body.fora.join(" ")).toContain("Quem registrou");
    expect(body.bairros.centro).toBe("Centro");
  });

  test("with a licence: named in the index and in a Link header", async () => {
    const res = await get(openDataApp(fakeStore([]).store, { ...canoas, openDataLicence: "CC-BY-4.0" }, now), "/");
    expect(res.headers.get("link")).toBe('<https://creativecommons.org/licenses/by/4.0/deed.pt-br>; rel="license"');
    expect((await res.json()).licenca.codigo).toBe("CC-BY-4.0");
  });

  test("pages: a full page links to the next, after its last code, keeping the filters", async () => {
    const { store, asked } = fakeStore([row("AAAA1"), row("BBBB2"), row("CCCC3")]);
    const res = await get(openDataApp(store, canoas, now), "/v1/registros?bairro=centro&limite=2");
    const body = await res.json();
    expect(body.registros.map((r: { codigo: string }) => r.codigo)).toEqual(["AAAA1", "BBBB2"]);
    expect(body.registros[0].dias).toBe(41);
    expect(body.proximo).toBe("/v1/registros?bairro=centro&limite=2&apos=BBBB2");
    expect(asked[0]).toEqual({ filters: { bairro: "centro" }, limit: 2 });
    const last = await (await get(openDataApp(store, canoas, now), "/v1/registros?limite=5")).json();
    expect(last.proximo).toBeNull();
  });

  test("bad input is refused", async () => {
    const app = openDataApp(fakeStore([]).store, canoas, now);
    expect((await get(app, "/v1/registros?desde=ontem")).status).toBe(400);
    expect((await get(app, "/v1/registros?limite=5000")).status).toBe(422);
    expect((await get(app, "/v1/registros/x'%3B--")).status).toBe(422);
  });

  test("CSV and GeoJSON exports, with their types", async () => {
    const app = openDataApp(fakeStore([row("AAAA1"), row("BAIRR", { lng: null, lat: null })]).store, canoas, now);
    const csv = await get(app, "/v1/registros.csv");
    expect(csv.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(csv.headers.get("content-disposition")).toContain("canoas-registros.csv");
    const text = await csv.text();
    expect(text.split("\r\n")[0]).toStartWith("codigo,tipo,categoria,categoria_nome");
    expect(text).toContain("AAAA1,occurrence,buraco,Buraco na rua");
    const geo = await get(app, "/v1/registros.geojson");
    expect(geo.headers.get("content-type")).toBe("application/geo+json; charset=utf-8");
    const fc = await geo.json();
    expect(fc.features).toHaveLength(2);
    expect(fc.features[1].geometry).toBeNull();
  });

  test("one record with its timeline; an unknown one is a 404", async () => {
    const events: OpenEventRow[] = [
      { codigo: "AAAA1", em: new Date("2026-09-01T15:00:00Z"), ordem: 1, evento: "created", quem: null, texto: null },
      {
        codigo: "AAAA1",
        em: new Date("2026-09-01T21:00:00Z"),
        ordem: 2,
        evento: "sent_to_authority",
        quem: "Fala, Canoas",
        texto: "Enviado à Prefeitura no resumo diário. O relógio começou.",
      },
    ];
    const app = openDataApp(fakeStore([row("AAAA1")], events).store, canoas, now);
    const body = await (await get(app, "/v1/registros/aaaa1")).json();
    expect(body.registro.codigo).toBe("AAAA1");
    expect(body.historico.map((e: { evento: string }) => e.evento)).toEqual(["created", "sent_to_authority"]);
    expect((await get(app, "/v1/registros/ZZZZ9")).status).toBe(404);
  });
});
