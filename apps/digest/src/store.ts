import type { DigestItem } from "@fala/core";
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
  kind: "occurrence" | "public_issue";
  category: string;
  title: string;
  text: string;
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
): DigestStore & { close(): Promise<void> } {
  const client = new Client({ connectionString });
  const connected = client.connect();
  const q = async <T extends object>(sql: string, params: unknown[] = []) => {
    await connected;
    return (await client.query<T>(sql, params)).rows;
  };
  return {
    async pending() {
      const rows = await q<PendingRow>(
        // A report waits until moderation has looked at its photos: the Ouvidoria gets, in the Fala's
        // name, only what anyone can already see. Removed photos never go.
        `select i.id, i.kind, i.category, i.title, i.text, i.neighborhood, i.scope, i.confirmations, i.created_at,
                coalesce(array_agg(p.src order by p.position) filter (where p.review = 'approved'), '{}') as photos
           from fala.items i left join fala.item_photos p on p.item_id = i.id
          where i.sent_at is null and i.moderation = 'published' and not i.demo and i.kind = 'occurrence'
          group by i.id
         having count(*) filter (where p.review = 'pending') = 0
          order by i.created_at`,
      );
      return rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        category: r.category,
        title: r.title,
        text: r.text,
        neighborhood: r.neighborhood,
        scope: r.scope,
        days: 0,
        updatedMinutesAgo: 0,
        confirmations: r.confirmations,
        followers: 0,
        updates: 0,
        photos: r.photos.map((src) => ({ src, takenAt: "", by: "" })),
        visibility: "anonymous",
        author: null,
        community: "reported",
        official: null,
        createdAt: r.created_at.toISOString(),
      }));
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
export async function writeProtocol(
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

/** The CLI's `protocolo`: one report, by hand. */
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

/** Replies to the resumo in Postgres: what takeReply needs, and the operator's review. */
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
    /** One reply by the start of its id, as the list shows it. */
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
