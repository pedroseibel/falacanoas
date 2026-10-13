import type { DigestItem } from "@fala/core";
import { Client } from "pg";
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

export function pgStore(connectionString: string, actor: string): DigestStore & { close(): Promise<void> } {
  const client = new Client({ connectionString });
  const connected = client.connect();
  const q = async <T extends object>(sql: string, params: unknown[] = []) => {
    await connected;
    return (await client.query<T>(sql, params)).rows;
  };
  return {
    async pending() {
      const rows = await q<PendingRow>(
        `select i.id, i.kind, i.category, i.title, i.text, i.neighborhood, i.scope, i.confirmations, i.created_at,
                coalesce(array_agg(p.src order by p.position) filter (where p.src is not null), '{}') as photos
           from fala.items i left join fala.item_photos p on p.item_id = i.id
          where i.sent_at is null and i.moderation = 'published' and not i.demo and i.kind = 'occurrence'
          group by i.id
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
    async markSent(d) {
      await connected;
      try {
        await client.query("begin");
        await client.query(
          `insert into fala.digests (sent_at, recipients, subject, body, item_ids, transport, message_id)
           values ($1, $2, $3, $4, $5, $6, $7)`,
          [d.sentAt, d.recipients, d.subject, d.body, d.itemIds, d.transport, d.messageId],
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
 * A protocol number the Ouvidoria sent back for a report (round 5): kept on the item, where its page
 * shows the legal deadline, and in its history. Only for reports already sent.
 */
export async function recordProtocol(
  connectionString: string,
  actor: string,
  input: { id: string; number: string; at: Date },
): Promise<boolean> {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query("begin");
    const r = await client.query(
      // A date-only protocol from the day of the send can't come before the send itself.
      `update fala.items set protocol_number = $2, protocol_at = greatest($3, sent_at), updated_at = now()
        where id = $1 and sent_at is not null returning protocol_at`,
      [input.id, input.number, input.at],
    );
    const at = r.rows[0]?.protocol_at;
    if (!at) {
      await client.query("rollback");
      return false;
    }
    await client.query(
      `insert into fala.item_events (item_id, at, kind, actor, text) values ($1, $2, 'sent_to_authority', $3, $4)`,
      [input.id, at, actor, `A Ouvidoria registrou o protocolo ${input.number}.`],
    );
    await client.query("commit");
    return true;
  } finally {
    await client.end();
  }
}
