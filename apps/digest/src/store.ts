import {
  FLOOD_NEARBY_METERS,
  floodHistory,
  itemRain,
  rainWindow,
  type DigestItem,
  type FloodNotes,
  type Municipality,
  type MonthlyReport,
  type MonthlyRow,
} from "@fala/core";
import { Client } from "pg";
import type { ReplyStore, StoredReading } from "./replies";
import type { DigestStore } from "./run";

/**
 * The digest's side of Postgres: reads the reports not sent yet, and marks a digest sent. Plain SQL
 * over the app's tables (apps/web owns the schema and its migrations).
 */

const SENT_TEXT = "Enviado à Prefeitura no resumo diário. O relógio começou.";
/** One run at a time, across processes: a session advisory lock. */
const LOCK = 7_314_002;

interface PendingRow {
  id: string;
  category: string;
  title: string;
  text: string;
  reference: string | null;
  address: string | null;
  flooding: FloodNotes | null;
  neighborhood: string | null;
  scope: DigestItem["scope"];
  confirmations: number;
  created_at: Date;
  photos: string[];
}

export function pgStore(
  connectionString: string,
  actor: string,
  timezone: string,
  /** For the day's rain on flooding records (BUILD 6.3); without it, none. */
  muni?: Pick<Municipality, "categories" | "timezone" | "rain">,
): DigestStore & { close(): Promise<void> } {
  const client = new Client({ connectionString });
  const connected = client.connect();
  const q = async <T extends object>(sql: string, params: unknown[] = []) => {
    await connected;
    return (await client.query<T>(sql, params)).rows;
  };
  async function withRain(found: DigestItem[], m: NonNullable<typeof muni>): Promise<DigestItem[]> {
    const windows = found.map((it) => rainWindow(m, it)).filter((w) => w !== null);
    if (!windows.length) return found;
    const from = new Date(Math.min(...windows.map((w) => w.from.getTime())));
    const to = new Date(Math.max(...windows.map((w) => w.to.getTime())));
    const readings = (
      await q<{ gauge: number; observed_at: Date; acc24: number }>(
        `select gauge, observed_at, acc24h::float8 as acc24 from fala.rain_readings where observed_at >= $1 and observed_at < $2`,
        [from, to],
      )
    ).map((r) => ({ gauge: r.gauge, observedAt: r.observed_at, acc24: r.acc24 }));
    return found.map((it) => {
      const rain = itemRain(m, it, readings);
      return rain ? { ...it, rain } : it;
    });
  }

  /**
   * The stretch's days on the flooding records (BUILD 6.5), from one read of the city's published
   * flooding records and their approved photos (real ones only, as the resumo is).
   */
  async function withHistory(found: DigestItem[], m: NonNullable<typeof muni>): Promise<DigestItem[]> {
    const types = m.categories.filter((c) => c.asks === "flooding").map((c) => c.key);
    if (!types.length || !found.some((it) => types.includes(it.category))) return found;
    const sightings = (
      await q<{ lng: number; lat: number; at: Date }>(
        `select i.lng, i.lat, i.created_at as at from fala.items i
          where i.category = any($1) and i.moderation = 'published' and not i.demo and i.lng is not null and i.lat is not null
         union all
         select i.lng, i.lat, p.taken_at as at from fala.item_photos p join fala.items i on i.id = p.item_id
          where i.category = any($1) and i.moderation = 'published' and not i.demo and p.review = 'approved'
            and i.lng is not null and i.lat is not null`,
        [types],
      )
    ).map((r) => ({ at: [r.lng, r.lat] satisfies [number, number], when: r.at }));
    return found.map((it) => {
      const s = it.scope;
      if (
        !types.includes(it.category) ||
        (s.type !== "point" && s.type !== "place") ||
        s.lng === undefined ||
        s.lat === undefined
      )
        return it;
      // The record itself counts (it's published; the read above has it too, and the day dedupes).
      const own = { at: [s.lng, s.lat] satisfies [number, number], when: new Date(it.createdAt ?? 0) };
      const h = floodHistory([s.lng, s.lat], [own, ...sightings], m.timezone, FLOOD_NEARBY_METERS);
      return h ? { ...it, floodHistory: h } : it;
    });
  }

  return {
    async pending() {
      const rows = await q<PendingRow>(
        // A report waits until moderation has looked at its photos: the Ouvidoria gets, in the Fala's
        // name, only what anyone can already see. Removed photos never go.
        `select i.id, i.category, i.title, i.text, i.reference, i.address, i.flooding, i.neighborhood, i.scope, i.confirmations, i.created_at,
                coalesce(array_agg(p.src order by p.position) filter (where p.review = 'approved'), '{}') as photos
           from fala.items i left join fala.item_photos p on p.item_id = i.id
          where i.sent_at is null and i.moderation = 'published' and not i.demo and i.kind = 'occurrence'
          group by i.id
         having count(*) filter (where p.review = 'pending') = 0
          order by i.created_at`,
      );
      const found: DigestItem[] = rows.map((r) => ({
        id: r.id,
        category: r.category,
        title: r.title,
        text: r.text,
        ...(r.reference ? { reference: r.reference } : {}),
        address: r.address,
        neighborhood: r.neighborhood,
        scope: r.scope,
        confirmations: r.confirmations,
        photos: r.photos.map((src) => ({ src })),
        createdAt: r.created_at.toISOString(),
        ...(r.flooding ? { flooding: r.flooding } : {}),
      }));
      return muni ? withHistory(await withRain(found, muni), muni) : found;
    },
    async nextNumber(year) {
      // The year by the instance's clock: a resumo sent at 18h on 31 December is that year's last.
      const [row] = await q<{ n: number }>(
        `select coalesce(max(number), 0)::int + 1 as n from fala.digests
          where extract(year from sent_at at time zone $2) = $1`,
        [year, timezone],
      );
      return row?.n ?? 1;
    },
    async markSent(d) {
      await connected;
      try {
        await client.query("begin");
        await client.query(
          `insert into fala.digests (sent_at, recipients, subject, body, item_ids, transport, message_id, number, pdf_sha256)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [d.sentAt, d.recipients, d.subject, d.body, d.itemIds, d.transport, d.messageId, d.number, d.pdfSha256],
        );
        const marked = await client.query<{ id: string }>(
          `update fala.items set sent_at = $1, updated_at = $1 where id = any($2) and sent_at is null returning id`,
          [d.sentAt, d.itemIds],
        );
        await client.query(
          `insert into fala.item_events (item_id, at, kind, actor, text)
           select id, $1, 'sent_to_authority', $2, $3 from unnest($4::text[]) as id`,
          [d.sentAt, actor, SENT_TEXT, marked.rows.map((r) => r.id)],
        );
        await client.query("commit");
      } catch (e) {
        await client.query("rollback").catch(() => undefined);
        throw e;
      }
    },
    async exclusive(f) {
      const [lock] = await q<{ got: boolean }>("select pg_try_advisory_lock($1) as got", [LOCK]);
      if (!lock?.got) return null;
      try {
        return await f();
      } finally {
        await q("select pg_advisory_unlock($1)", [LOCK]);
      }
    },
    close: () => client.end(),
  };
}

/**
 * A protocol number the Prefeitura sent back for reports (round 5): kept on each item, where its page
 * shows the legal deadline, and in its history, naming the body that answered. Only for reports
 * already sent; never repeated; with `keep`, a report that has a protocol keeps it (a protocol for the
 * whole resumo doesn't replace one given to the report itself). Returns the codes written.
 */
async function writeProtocol(
  client: Client,
  input: { ids: string[]; number: string; at: Date; by: string; keep: boolean; actor: string },
): Promise<string[]> {
  await client.query("begin");
  try {
    const r = await client.query<{ id: string; protocol_at: Date }>(
      // A date-only protocol from the day of the send can't come before the send itself.
      `update fala.items set protocol_number = $2, protocol_at = greatest($3, sent_at), updated_at = now()
        where id = any($1) and sent_at is not null and protocol_number is distinct from $2
          and (not $4 or protocol_number is null)
        returning id, protocol_at`,
      [input.ids, input.number, input.at, input.keep],
    );
    await client.query(
      `insert into fala.item_events (item_id, at, kind, actor, text)
       select r.id, r.at, 'sent_to_authority', $3, $4 from unnest($1::text[], $2::timestamptz[]) as r(id, at)`,
      [
        r.rows.map((x) => x.id),
        r.rows.map((x) => x.protocol_at),
        input.actor,
        `${input.by} registrou o protocolo ${input.number}.`,
      ],
    );
    await client.query("commit");
    return r.rows.map((x) => x.id);
  } catch (e) {
    await client.query("rollback").catch(() => undefined);
    throw e;
  }
}

export async function recordProtocol(
  connectionString: string,
  input: { id: string; number: string; at: Date; by: string; actor: string },
): Promise<boolean> {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    return (await writeProtocol(client, { ...input, ids: [input.id], keep: false })).length > 0;
  } finally {
    await client.end();
  }
}

export interface ReplyRow {
  id: string;
  received_at: Date;
  from_address: string;
  subject: string;
  body: string;
  reading: StoredReading;
  trusted: boolean;
  status: "applied" | "review" | "dismissed";
  digest_id: string | null;
  item_ids: string[] | null;
}

export function pgReplyStore(connectionString: string, actor: string, timezone: string) {
  const client = new Client({ connectionString });
  const connected = client.connect();
  const q = async <T extends object>(sql: string, params: unknown[] = []) => {
    await connected;
    return (await client.query<T>(sql, params)).rows;
  };
  const store: ReplyStore = {
    async seen(messageId) {
      return (await q("select 1 from fala.digest_replies where message_id = $1", [messageId])).length > 0;
    },
    async resumoFor(refs, number) {
      const [byRef] = refs.length
        ? await q<{ id: string; item_ids: string[] }>(
            "select id, item_ids from fala.digests where message_id = any($1) order by sent_at desc limit 1",
            [refs],
          )
        : [];
      const [byNumber] =
        !byRef && number
          ? await q<{ id: string; item_ids: string[] }>(
              `select id, item_ids from fala.digests
                where number = $1 and extract(year from sent_at at time zone $3) = $2`,
              [number.number, number.year, timezone],
            )
          : [];
      const row = byRef ?? byNumber;
      return row ? { id: row.id, itemIds: row.item_ids } : null;
    },
    async recentCodes() {
      const rows = await q<{ id: string }>("select id from fala.items where sent_at > now() - interval '120 days'");
      return rows.map((r) => r.id);
    },
    async protocol(input) {
      await connected;
      return writeProtocol(client, { ...input, actor });
    },
    async record({ mail, resumoId, body, reading, trusted, status }) {
      const [row] = await q<{ id: string }>(
        `insert into fala.digest_replies (received_at, message_id, digest_id, from_address, subject, body, reading, trusted, status)
         values (now(), $1, $2, $3, $4, $5, $6, $7, $8) returning id`,
        [mail.messageId, resumoId, mail.from, mail.subject, body, JSON.stringify(reading), trusted, status],
      );
      if (!row) throw new Error("resposta não gravada");
      return row.id;
    },
  };
  return {
    ...store,
    /** Replies waiting for a person, oldest first. */
    waiting: () =>
      q<ReplyRow>(
        `select r.*, d.item_ids from fala.digest_replies r left join fala.digests d on d.id = r.digest_id
          where r.status = 'review' order by r.received_at`,
      ),
    async find(prefix: string) {
      const rows = await q<ReplyRow>(
        `select r.*, d.item_ids from fala.digest_replies r left join fala.digests d on d.id = r.digest_id
          where r.id::text like $1 || '%'`,
        [prefix.toLowerCase()],
      );
      return rows.length === 1 ? (rows[0] ?? null) : null;
    },
    decide: (id: string, status: "applied" | "dismissed", by: string, reading?: StoredReading) =>
      q(
        `update fala.digest_replies set status = $2, decided_at = now(), decided_by = $3,
                reading = coalesce($4::jsonb, reading) where id = $1`,
        [id, status, by, reading ? JSON.stringify(reading) : null],
      ),
    close: () => client.end(),
  };
}

/**
 * The monthly report's side of Postgres: every real report already sent (core monthly-report.ts picks
 * the month), whether a month was already built, and keeping one. A month is built once.
 */
export function pgMonthlyStore(connectionString: string) {
  const client = new Client({ connectionString });
  const connected = client.connect();
  const q = async <T extends object>(sql: string, params: unknown[] = []) => {
    await connected;
    return (await client.query<T>(sql, params)).rows;
  };
  return {
    async rows(): Promise<MonthlyRow[]> {
      const rows = await q<{
        id: string;
        category: string;
        neighborhood: string | null;
        confirmations: number;
        guest: boolean;
        sent_at: Date;
        closed_at: Date | null;
        protocol_at: Date | null;
      }>(
        `select id, category, neighborhood, confirmations, guest, sent_at, closed_at, protocol_at from fala.items
          where sent_at is not null and not demo and kind = 'occurrence' and moderation = 'published'`,
      );
      return rows.map((r) => ({
        id: r.id,
        category: r.category,
        neighborhood: r.neighborhood,
        confirmations: r.confirmations,
        guest: r.guest,
        sentAt: r.sent_at,
        closedAt: r.closed_at,
        protocolAt: r.protocol_at,
      }));
    },
    async built(month: string): Promise<boolean> {
      return (await q("select 1 from fala.monthly_reports where month = $1", [month])).length > 0;
    },
    /** False when the month was built meanwhile: the first one stands. */
    async keep(input: { report: MonthlyReport; generatedAt: Date; pdf: Uint8Array; sha256: string }): Promise<boolean> {
      const rows = await q(
        `insert into fala.monthly_reports (month, generated_at, figures, pdf, pdf_sha256) values ($1, $2, $3, $4, $5)
         on conflict (month) do nothing returning month`,
        [input.report.month, input.generatedAt, JSON.stringify(input.report), Buffer.from(input.pdf), input.sha256],
      );
      return rows.length > 0;
    },
    close: () => client.end(),
  };
}
