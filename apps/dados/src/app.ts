import {
  EVENT_COLUMNS,
  OPEN_DATA_DICTIONARY,
  OPEN_DATA_LICENCES,
  RECORD_COLUMNS,
  openEvent,
  openRecord,
  toCsv,
  toFeatureCollection,
  type Municipality,
} from "@fala/core";
import { Elysia, t } from "elysia";
import type { Filters, Store } from "./store";

/**
 * The open-data API (DECISIONS round 10; BUILD 3.3): read-only, no account, open to any site (CORS),
 * cached for five minutes. JSON pages for programs, GeoJSON for maps, CSV for spreadsheets.
 */

const PAGE = 100;
const PAGE_MAX = 1000;
const EXPORT_MAX = 50_000;
const EVENTS_MAX = 500_000;

const filters = t.Object({
  bairro: t.Optional(t.String({ maxLength: 64 })),
  categoria: t.Optional(t.String({ maxLength: 64 })),
  estado: t.Optional(t.String({ maxLength: 32 })),
  desde: t.Optional(t.String({ maxLength: 40 })),
  apos: t.Optional(t.String({ maxLength: 12 })),
  limite: t.Optional(t.Numeric({ minimum: 1, maximum: PAGE_MAX })),
});

/** Exports take every match: no page size, no cursor. */
const everything = ({ limite: _size, apos: _cursor, ...f }: Filters & { limite?: number }): Filters => f;

const badSince = (f: Filters) => f.desde !== undefined && Number.isNaN(Date.parse(f.desde));

export function openDataApp(
  store: Pick<Store, "records" | "record" | "events">,
  muni: Municipality,
  now = () => new Date(),
) {
  const licence = muni.openDataLicence
    ? { codigo: muni.openDataLicence, ...OPEN_DATA_LICENCES[muni.openDataLicence] }
    : null;
  const common: Record<string, string> = {
    "access-control-allow-origin": "*",
    "cache-control": "public, max-age=300",
    ...(licence ? { link: `<${licence.url}>; rel="license"` } : {}),
  };
  const index = {
    nome: `Dados abertos do ${muni.branding.name}`,
    descricao: `Os problemas urbanos registrados por moradores de ${muni.name} no ${muni.branding.name}, com o histórico de cada um: quando foi enviado à Prefeitura, o que o poder público respondeu e quando os vizinhos confirmaram o conserto.`,
    licenca: licence,
    ...(licence
      ? { atribuicao: `${muni.branding.name} (${muni.branding.domain})` }
      : {
          aviso:
            "A licença destes dados ainda não foi escolhida (CC BY 4.0 ou ODbL). Até lá, isto é uma prévia: os dados não podem ser reutilizados.",
        }),
    enderecos: {
      registros: "/v1/registros",
      geojson: "/v1/registros.geojson",
      csv: "/v1/registros.csv",
      registro: "/v1/registros/{codigo}",
      historico_csv: "/v1/historico.csv",
    },
    filtros: {
      bairro: "chave do bairro (veja bairros)",
      categoria: "chave da categoria (veja categorias)",
      estado: "estado_comunidade",
      desde: "só o que mudou desde esta data (ISO 8601)",
      apos: "paginação: os registros depois deste código",
      limite: `registros por página, até ${PAGE_MAX} (padrão ${PAGE})`,
    },
    dicionario: { registros: OPEN_DATA_DICTIONARY.registros, historico: OPEN_DATA_DICTIONARY.historico },
    fora: OPEN_DATA_DICTIONARY.fora,
    bairros: Object.fromEntries(muni.neighborhoods.map((n) => [n.slug, n.name])),
    categorias: Object.fromEntries(
      muni.categories.map((c) => [c.key, { nome: c.label, orgao_responsavel: c.agency ?? null }]),
    ),
  };

  return new Elysia()
    .onRequest(({ set }) => {
      Object.assign(set.headers, common);
    })
    .get("/", () => index)
    .get(
      "/v1/registros",
      async ({ query, request, status }) => {
        if (badSince(query)) return status(400, { erro: "desde precisa ser uma data ISO 8601." });
        const { limite, ...filtered } = query;
        const limit = limite ?? PAGE;
        const rows = await store.records(filtered, limit);
        const at = now();
        const last = rows.at(-1);
        let next: string | null = null;
        if (last && rows.length === limit) {
          const url = new URL(request.url);
          url.searchParams.set("apos", last.codigo);
          next = `${url.pathname}${url.search}`;
        }
        return { licenca: licence?.codigo ?? null, registros: rows.map((r) => openRecord(r, muni, at)), proximo: next };
      },
      { query: filters },
    )
    .get(
      "/v1/registros.geojson",
      async ({ query, set, status }) => {
        if (badSince(query)) return status(400, { erro: "desde precisa ser uma data ISO 8601." });
        const at = now();
        set.headers["content-type"] = "application/geo+json; charset=utf-8";
        const rows = await store.records(everything(query), EXPORT_MAX);
        return JSON.stringify(toFeatureCollection(rows.map((r) => openRecord(r, muni, at))));
      },
      { query: filters },
    )
    .get(
      "/v1/registros.csv",
      async ({ query, set, status }) => {
        if (badSince(query)) return status(400, { erro: "desde precisa ser uma data ISO 8601." });
        const at = now();
        const rows = await store.records(everything(query), EXPORT_MAX);
        set.headers["content-type"] = "text/csv; charset=utf-8";
        set.headers["content-disposition"] = `attachment; filename="${muni.slug}-registros.csv"`;
        return toCsv(
          rows.map((r) => openRecord(r, muni, at)),
          RECORD_COLUMNS,
        );
      },
      { query: filters },
    )
    .get("/v1/historico.csv", async ({ set }) => {
      const rows = await store.events(null, EVENTS_MAX);
      set.headers["content-type"] = "text/csv; charset=utf-8";
      set.headers["content-disposition"] = `attachment; filename="${muni.slug}-historico.csv"`;
      return toCsv(rows.map(openEvent), EVENT_COLUMNS);
    })
    .get(
      "/v1/registros/:codigo",
      async ({ params, status }) => {
        const codigo = params.codigo.toUpperCase();
        const row = await store.record(codigo);
        if (!row) return status(404, { erro: "Registro não encontrado." });
        const events = await store.events(codigo, 10_000);
        return {
          licenca: licence?.codigo ?? null,
          registro: openRecord(row, muni, now()),
          historico: events.map(openEvent),
        };
      },
      { params: t.Object({ codigo: t.String({ pattern: "^[A-Za-z0-9]{4,12}$" }) }) },
    );
}
