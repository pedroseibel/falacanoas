import type { OpenEventRow, OpenRow } from "@fala/core";
import { Pool } from "pg";

/** Reads from the `dados` views, the only thing the fala_dados role can see. */

export interface Filters {
  bairro?: string;
  categoria?: string;
  estado?: string;
  /** Only what changed since then (ISO): for keeping a copy in sync. */
  desde?: string;
  /** Paging: the records after this code, in the order they were registered. */
  apos?: string;
}

/** The filters as SQL, values as parameters: column names are fixed here, never taken from input. */
function where(f: Filters) {
  const conds: string[] = [];
  const params: unknown[] = [];
  const add = (sql: (n: string) => string, value: unknown) => {
    params.push(value);
    conds.push(sql(`$${params.length}`));
  };
  if (f.bairro) add((p) => `bairro = ${p}`, f.bairro);
  if (f.categoria) add((p) => `categoria = ${p}`, f.categoria);
  if (f.estado) add((p) => `estado_comunidade = ${p}`, f.estado);
  // As an instant: JavaScript accepted the text (app.ts), Postgres might not ("1" is a year to one, nothing to the other).
  if (f.desde) add((p) => `atualizado_em >= ${p}`, new Date(f.desde).toISOString());
  if (f.apos)
    add(
      (p) => `(registrado_em, codigo) > (select registrado_em, codigo from dados.registros where codigo = ${p})`,
      f.apos.toUpperCase(),
    );
  return { sql: conds.length ? `where ${conds.join(" and ")}` : "", params };
}

export function pgStore(connectionString: string) {
  const pool = new Pool({ connectionString, max: 4 });

  return {
    async records(f: Filters, limit: number): Promise<OpenRow[]> {
      const w = where(f);
      const { rows } = await pool.query<OpenRow>(
        `select * from dados.registros ${w.sql} order by registrado_em, codigo limit $${w.params.length + 1}`,
        [...w.params, limit],
      );
      return rows;
    },
    async record(codigo: string): Promise<OpenRow | null> {
      const { rows } = await pool.query<OpenRow>("select * from dados.registros where codigo = $1", [codigo]);
      return rows[0] ?? null;
    },
    async events(codigo: string | null, limit: number): Promise<OpenEventRow[]> {
      const { rows } = await pool.query<OpenEventRow>(
        `select * from dados.historico ${codigo ? "where codigo = $2" : ""} order by codigo, em, ordem limit $1`,
        codigo ? [limit, codigo] : [limit],
      );
      return rows;
    },
    close: () => pool.end(),
  };
}

export type Store = ReturnType<typeof pgStore>;
