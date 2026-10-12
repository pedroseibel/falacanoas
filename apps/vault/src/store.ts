import { evidenceCutoff, holdActive, type Connection, type EvidenceAction } from "@fala/core";
import { and, asc, eq, gte, inArray, isNotNull, isNull, lt, lte, not, or, sql, type SQL } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import type { VaultStore } from "./gateway";
import * as schema from "./schema";
import { accessEvidence, codes, hits, phones, preservationHolds } from "./schema";

type Db = NodePgDatabase<typeof schema>;

/**
 * The vault's store on Postgres, connected with the vault's own role (VAULT_DATABASE_URL), which can
 * reach fala_cofre and nothing else. One connection per request: Workers can't share sockets.
 */
export async function openStore(url: string): Promise<{
  store: VaultStore;
  touchAccount: (accountId: string, at: Date) => Promise<void>;
  recordEvidence: (e: Evidence) => Promise<void>;
  purge: (now: Date) => Promise<PurgeReport>;
  close: () => Promise<void>;
}> {
  const client = new Client({ connectionString: url });
  await client.connect();
  const db = drizzle(client, { schema, casing: "snake_case" });
  return {
    store: pgStore(db),
    touchAccount: (id, at) => touchAccount(db, id, at),
    recordEvidence: (e) => recordEvidence(db, e),
    purge: (now) => purge(db, now),
    close: () => client.end(),
  };
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
    async linkOf(accountId) {
      const [row] = await db
        .select({
          id: phones.id,
          accountId: phones.accountId,
          keyVersion: phones.keyVersion,
          phoneMac: phones.phoneMac,
          phoneSealed: phones.phoneSealed,
          verifiedAt: phones.verifiedAt,
          lastSignInAt: phones.lastSignInAt,
        })
        .from(phones)
        .where(and(eq(phones.accountId, accountId), isNull(phones.unlinkedAt)));
      return row ?? null;
    },
    async unlinkAccount(accountId, at) {
      await db
        .update(phones)
        .set({ unlinkedAt: at })
        .where(and(eq(phones.accountId, accountId), isNull(phones.unlinkedAt)));
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

export interface Evidence {
  action: EvidenceAction;
  accountId: string | null;
  itemId: string | null;
  connection: Connection;
  at: Date;
}

async function recordEvidence(db: Db, e: Evidence): Promise<void> {
  await db
    .insert(accessEvidence)
    .values({ action: e.action, accountId: e.accountId, itemId: e.itemId, ...e.connection, at: e.at });
}

export interface PurgeReport {
  evidence: number;
  links: number;
  holds: number;
}

/**
 * The daily clean-up (round 18, Q23): evidence and unlinked phone links older than 6 months go,
 * except what an active preservation hold covers; expired codes and day-old rate-limit hits go too.
 */
async function purge(db: Db, now: Date): Promise<PurgeReport> {
  const cutoff = evidenceCutoff(now);
  const holds = (await db.select().from(preservationHolds)).filter((h) => holdActive(h, now));

  const held: SQL[] = holds.flatMap((h) => {
    const scope = [
      h.accountId ? eq(accessEvidence.accountId, h.accountId) : undefined,
      h.itemId ? eq(accessEvidence.itemId, h.itemId) : undefined,
    ].filter((c) => c !== undefined);
    const range = [
      h.coversFrom ? gte(accessEvidence.at, h.coversFrom) : undefined,
      h.coversTo ? lte(accessEvidence.at, h.coversTo) : undefined,
    ].filter((c) => c !== undefined);
    const covered = and(or(...scope), ...range);
    return covered ? [covered] : [];
  });
  const anyHeld = or(...held);
  const evidence = await db
    .delete(accessEvidence)
    .where(and(lt(accessEvidence.at, cutoff), anyHeld ? not(anyHeld) : undefined));

  const heldAccounts = holds.flatMap((h) => (h.accountId ? [h.accountId] : []));
  const links = await db
    .delete(phones)
    .where(
      and(
        isNotNull(phones.unlinkedAt),
        lt(phones.unlinkedAt, cutoff),
        heldAccounts.length ? not(inArray(phones.accountId, heldAccounts)) : undefined,
      ),
    );

  await db.delete(codes).where(lt(codes.expiresAt, now));
  await db.delete(hits).where(lt(hits.at, new Date(now.getTime() - DAY_MS)));
  return { evidence: evidence.rowCount ?? 0, links: links.rowCount ?? 0, holds: holds.length };
}
