import { Pool } from "pg";
import type { SignupStore } from "./conversation";

/** The queue's WhatsApp sign-ups in Postgres (`fala.queue_signups`, owned by apps/web's schema). */
export function pgStore(connectionString: string): SignupStore & { close(): Promise<void> } {
  const pool = new Pool({ connectionString, max: 2 });
  return {
    async find(numbers) {
      const { rows } = await pool.query<{ id: string; neighborhood: string; code: string; confirmed: boolean }>(
        `select id, neighborhood, code, confirmed_at is not null as confirmed
           from fala.queue_signups
          where channel = 'whatsapp' and contact = any($1)
          order by confirmed_at nulls last
          limit 1`,
        [numbers],
      );
      return rows[0] ?? null;
    },
    async confirm(id, neighborhood) {
      await pool.query(
        `update fala.queue_signups set confirmed_at = now(), updated_at = now() where id = $1 and confirmed_at is null`,
        [id],
      );
      const { rows } = await pool.query<{ n: number }>(
        `select count(*)::int as n from fala.queue_signups where neighborhood = $1 and confirmed_at is not null`,
        [neighborhood],
      );
      return rows[0]?.n ?? 0;
    },
    async leave(numbers) {
      const { rows } = await pool.query<{ neighborhood: string }>(
        `delete from fala.queue_signups where channel = 'whatsapp' and contact = any($1) returning neighborhood`,
        [numbers],
      );
      return rows[0]?.neighborhood ?? null;
    },
    close: () => pool.end(),
  };
}
