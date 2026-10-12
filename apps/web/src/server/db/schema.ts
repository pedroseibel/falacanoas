import { sql } from "drizzle-orm";
import { check, index, pgSchema, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * The database (Supabase Postgres, São Paulo). Every app table lives in the "fala" schema, which the
 * Supabase Data API doesn't expose: the browser never reaches the database, only the server does
 * (CLAUDE.md, research/DECISIONS.md round 9). RLS is on everywhere as a second lock.
 */
export const fala = pgSchema("fala");

export const signupChannel = fala.enum("signup_channel", ["whatsapp", "email"]);

/**
 * The landing page's bairro queue (rounds 6, 12 and 17). A sign-up counts toward its bairro only once
 * confirmed (WhatsApp message or e-mail link). The contact is kept for that confirmation and the
 * "your bairro opened" notice, and deleted on request (LGPD art. 18).
 */
export const queueSignups = fala
  .table(
    "queue_signups",
    {
      id: uuid().primaryKey().defaultRandom(),
      neighborhood: text().notNull(),
      channel: signupChannel().notNull(),
      /** 55 + digits for WhatsApp, lower-case for e-mail (normalizeContact). */
      contact: text().notNull().unique(),
      help: text()
        .array()
        .notNull()
        .default(sql`'{}'::text[]`),
      /** Four readable characters sent back to confirm. */
      code: text().notNull(),
      confirmedAt: timestamp({ withTimezone: true }),
      createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
      updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [
      index().on(t.neighborhood),
      check("queue_signups_code", sql`${t.code} ~ '^[A-Z0-9]{4}$'`),
      check("queue_signups_help", sql`${t.help} <@ array['moderar','codigo','divulgar']::text[]`),
    ],
  )
  .enableRLS();
