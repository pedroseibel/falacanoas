import { RAIN_WINDOWS, readCemadenFeed, type RainReading, type RainSource } from "@fala/core";
import { Client } from "pg";

/**
 * The rain archive (research/alagamentos; BUILD 6.1): every 10 minutes, the instance's gauges from
 * Cemaden's live feed into `fala.rain_readings`, one row per gauge per time it measured. The feed
 * keeps no history: its accumulations reach back 96 hours, and what isn't read by then is lost. A run
 * repeated stores nothing twice.
 */

export interface RainStore {
  /** Keeps the readings not kept yet; returns how many were new. */
  keep(readings: RainReading[], fetchedAt: Date): Promise<number>;
}

export type RainResult =
  | { ok: true; kept: number; read: number; skipped: number; missing: number[] }
  | { ok: false; error: "fetch" | "feed"; detail: string };

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

const USER_AGENT = "Fala, Canoas (falacanoas.com.br; arquivo de chuva)";

export async function archiveRain(
  source: RainSource,
  { fetch, store }: { fetch: Fetch; store: RainStore },
  now = new Date(),
): Promise<RainResult> {
  let json: unknown;
  try {
    const res = await fetch(source.feed, {
      headers: { "user-agent": USER_AGENT, accept: "application/json" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return { ok: false, error: "fetch", detail: `HTTP ${res.status}` };
    json = await res.json();
  } catch (e) {
    return { ok: false, error: "fetch", detail: String(e) };
  }
  if (!Array.isArray(json)) return { ok: false, error: "feed", detail: "a resposta não é uma lista de estações" };
  const ids = source.gauges.map((g) => g.id);
  const { readings, skipped } = readCemadenFeed(json, ids, now);
  const seen = new Set(readings.map((r) => r.gauge));
  const kept = readings.length ? await store.keep(readings, now) : 0;
  return { ok: true, kept, read: readings.length, skipped, missing: ids.filter((id) => !seen.has(id)) };
}

export function pgRainStore(connectionString: string): RainStore & { close(): Promise<void> } {
  const client = new Client({ connectionString });
  const connected = client.connect();
  return {
    async keep(readings, fetchedAt) {
      await connected;
      const values: unknown[] = [];
      const rows = readings.map((r) => {
        const row = [r.gauge, r.observedAt, r.last, ...RAIN_WINDOWS.map((h) => r.acc[h]), fetchedAt];
        const at = values.length;
        values.push(...row);
        return `(${row.map((_, i) => `$${at + i + 1}`).join(", ")})`;
      });
      const res = await client.query(
        `insert into fala.rain_readings (gauge, observed_at, last, acc1h, acc3h, acc6h, acc12h, acc24h, acc48h, acc72h, acc96h, fetched_at)
         values ${rows.join(", ")}
         on conflict (gauge, observed_at) do nothing`,
        values,
      );
      return res.rowCount ?? 0;
    },
    close: async () => {
      await connected.catch(() => {});
      await client.end();
    },
  };
}
