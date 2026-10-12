import { and, asc, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import type { VaultStore } from "./gateway";
import * as schema from "./schema";
import { codes, hits, phones } from "./schema";

type Db = NodePgDatabase<typeof schema>;

/**
 * The vault's store on Postgres, connected with the vault's own role (VAULT_DATABASE_URL), which can
 * reach fala_cofre and nothing else. One connection per request: Workers can't share sockets.
 */
export async function openStore(url: string): Promise<{
  store: VaultStore;
  touchAccount: (accountId: string, at: Date) => Promise<void>;
  close: () => Promise<void>;
}> {
  const client = new Client({ connectionString: url });
  await client.connect();
  const db = drizzle(client, { schema, casing: "snake_case" });
  return { store: pgStore(db), touchAccount: (id, at) => touchAccount(db, id, at), close: () => client.end() };
}

const DAY_MS = 24 * 3_600_000;

export function pgStore(db: Db): VaultStore {
  return {
    async hitsSince(key, since) {
      const rows = await db
        .select({ at: hits.at })
        .from(hits)
        .where(and(eq(hits.key, key), gte(hits.at, since)))
        .orderBy(asc(hits.at));
      return rows.map((r) => r.at);
    },
    async addHit(key, at) {
      await db.insert(hits).values({ key, at });
      // Nothing older than a day is ever read again.
      await db.delete(hits).where(and(eq(hits.key, key), lt(hits.at, new Date(at.getTime() - DAY_MS))));
    },
    async putCode(phoneMac, codeHash, expiresAt) {
      await db
        .insert(codes)
        .values({ phoneMac, codeHash, expiresAt })
        .onConflictDoUpdate({
          target: codes.phoneMac,
          set: { codeHash, expiresAt, attempts: 0, createdAt: sql`now()` },
        });
    },
    async getCode(phoneMac) {
      const [row] = await db.select().from(codes).where(eq(codes.phoneMac, phoneMac));
      return row ?? null;
    },
    async failCode(phoneMac) {
      await db
        .update(codes)
        .set({ attempts: sql`least(${codes.attempts} + 1, 3)` })
        .where(eq(codes.phoneMac, phoneMac));
    },
    async dropCode(phoneMac) {
      await db.delete(codes).where(eq(codes.phoneMac, phoneMac));
    },
    async findLink(phoneMacs) {
      const [row] = await db
        .select({
          id: phones.id,
          accountId: phones.accountId,
          keyVersion: phones.keyVersion,
          phoneMac: phones.phoneMac,
          verifiedAt: phones.verifiedAt,
          lastSignInAt: phones.lastSignInAt,
        })
        .from(phones)
        .where(and(inArray(phones.phoneMac, phoneMacs), isNull(phones.unlinkedAt)));
      return row ?? null;
    },
    async link({ replacing, accountId, phoneMac, phoneSealed, keyVersion, at }) {
      await db.transaction(async (tx) => {
        if (replacing) await tx.update(phones).set({ unlinkedAt: at }).where(eq(phones.id, replacing));
        await tx.insert(phones).values({
          accountId,
          phoneMac,
          phoneSealed,
          keyVersion,
          verifiedAt: at,
          lastSignInAt: at,
        });
      });
    },
    async touch(linkId, at, rekey) {
      await db
        .update(phones)
        .set({ lastSignInAt: at, ...rekey })
        .where(eq(phones.id, linkId));
    },
  };
}

/** A sign-in that didn't go through the gateway (a passkey): it still counts against dormancy. */
async function touchAccount(db: Db, accountId: string, at: Date): Promise<void> {
  await db
    .update(phones)
    .set({ lastSignInAt: at })
    .where(and(eq(phones.accountId, accountId), isNull(phones.unlinkedAt)));
}
