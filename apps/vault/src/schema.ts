import { sql } from "drizzle-orm";
import { check, index, integer, pgSchema, smallint, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

/**
 * The identity vault's tables (DECISIONS round 18, Q5 and Q29), in their own schema, reached only by
 * the vault's own database role. The app's role has no access here, and the Data API exposes none of it.
 * No phone is stored in clear: a lookup HMAC and an AES-GCM ciphertext, each under a versioned key
 * that lives outside the database.
 */
export const cofre = pgSchema("fala_cofre");

/** Which account a phone signs in to. A phone has at most one live link; old links keep their unlink date. */
export const phones = cofre
  .table(
    "phones",
    {
      id: uuid().primaryKey().defaultRandom(),
      accountId: uuid().notNull(),
      /** HMAC-SHA256 of the E.164 number, base64url, under key `keyVersion`. */
      phoneMac: text().notNull(),
      /** AES-256-GCM of the E.164 number: base64url of iv ‖ ciphertext. */
      phoneSealed: text().notNull(),
      keyVersion: integer().notNull(),
      /** First verification for this account: confirmations count 72 h after it (Q17). */
      verifiedAt: timestamp({ withTimezone: true }).notNull(),
      /** Last sign-in by any means: after 180 days without one, a code opens a new account (Q20). */
      lastSignInAt: timestamp({ withTimezone: true }).notNull(),
      unlinkedAt: timestamp({ withTimezone: true }),
      createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [
      uniqueIndex("phones_live_mac")
        .on(t.phoneMac)
        .where(sql`${t.unlinkedAt} is null`),
      uniqueIndex("phones_live_account")
        .on(t.accountId)
        .where(sql`${t.unlinkedAt} is null`),
    ],
  )
  .enableRLS();

/** The code waiting for each phone: only its keyed hash, single use, 3 tries, 5 minutes. */
export const codes = cofre
  .table(
    "codes",
    {
      phoneMac: text().primaryKey(),
      codeHash: text().notNull(),
      attempts: integer().notNull().default(0),
      expiresAt: timestamp({ withTimezone: true }).notNull(),
      createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [check("codes_attempts", sql`${t.attempts} between 0 and 3`)],
  )
  .enableRLS();

/**
 * A number change in progress (round 18, Q20), one per account: the ticket the person got after
 * re-authenticating (only its hash), how many codes it sent, and, once the new number is verified,
 * its masked hint for the app to pick up. Expired rows go in the daily purge.
 */
export const phoneChanges = cofre
  .table(
    "phone_changes",
    {
      accountId: uuid().primaryKey(),
      ticketHash: text().notNull().unique(),
      expiresAt: timestamp({ withTimezone: true }).notNull(),
      sends: integer().notNull().default(0),
      completedAt: timestamp({ withTimezone: true }),
      /** "(51) 9…4567", for the app to show; never the number. */
      hint: text(),
    },
    (t) => [check("phone_changes_sends", sql`${t.sends} between 0 and 3`)],
  )
  .enableRLS();

/** Rate-limit hits, keyed by purpose and an HMAC of the number or the IP. Kept for a day. */
export const hits = cofre
  .table(
    "hits",
    {
      id: uuid().primaryKey().defaultRandom(),
      key: text().notNull(),
      at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [index().on(t.key, t.at)],
  )
  .enableRLS();

/* ---------- Access evidence (round 18, Q21-Q23; Marco Civil art. 15) ---------- */

export const evidenceAction = cofre.enum("evidence_action", [
  "sign_in",
  "publication",
  "confirmation",
  "comment",
  "guest_pin",
  "account_closed",
  "phone_changed",
]);

/**
 * One row per sign-in, publication, confirmation, comment, guest pin, closed account or changed
 * number; never for reads. Deleted after 6 months unless a preservation hold covers it. Leaves the
 * Fala only by court order.
 */
export const accessEvidence = cofre
  .table(
    "access_evidence",
    {
      eventId: uuid().primaryKey().defaultRandom(),
      action: evidenceAction().notNull(),
      accountId: uuid(),
      /** The item published, confirmed, commented on or dropped as a guest pin. */
      itemId: text(),
      clientIp: text(),
      clientPort: integer(),
      ipVersion: smallint(),
      edgeIp: text(),
      edgePort: integer(),
      /** "tcp" (HTTP/1.1, HTTP/2) or "quic" (HTTP/3). */
      transport: text(),
      /** Correlation only: Ray IDs can repeat. */
      cfRay: text(),
      /** UTC, to the millisecond. */
      at: timestamp({ withTimezone: true, precision: 3 }).notNull().defaultNow(),
    },
    (t) => [index().on(t.at), index().on(t.accountId, t.at), index().on(t.itemId)],
  )
  .enableRLS();

/**
 * A preservation request (art. 15 §2): it suspends deletion for its scope, with its grounds and dates
 * documented, and lapses after 60 days unless a court order is sought (core: holdActive).
 */
export const preservationHolds = cofre
  .table(
    "preservation_holds",
    {
      id: uuid().primaryKey().defaultRandom(),
      /** Who asked and their reference (authority, procedure number). */
      reference: text().notNull(),
      grounds: text().notNull(),
      /** Scope: an account, an item, or both, optionally within a time range. */
      accountId: uuid(),
      itemId: text(),
      coversFrom: timestamp({ withTimezone: true }),
      coversTo: timestamp({ withTimezone: true }),
      requestedAt: timestamp({ withTimezone: true }).notNull(),
      courtOrderSoughtAt: timestamp({ withTimezone: true }),
      refusedAt: timestamp({ withTimezone: true }),
      endsAt: timestamp({ withTimezone: true }),
      releasedAt: timestamp({ withTimezone: true }),
      createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [check("preservation_holds_scope", sql`${t.accountId} is not null or ${t.itemId} is not null`)],
  )
  .enableRLS();
