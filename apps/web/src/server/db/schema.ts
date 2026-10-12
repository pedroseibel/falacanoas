import type { Scope } from "@fala/core";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

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

/* ---------- Items: occurrences and questões públicas (rounds 3, 4, 15, 18) ---------- */

export const itemKind = fala.enum("item_kind", ["occurrence", "public_issue"]);
export const communityStatus = fala.enum("community_status", [
  "reported",
  "confirmed",
  "ongoing",
  "apparently_resolved",
  "resolved",
]);
export const officialStatus = fala.enum("official_status", [
  "acknowledged",
  "under_review",
  "scheduled",
  "in_progress",
  "resolved",
]);
export const visibility = fala.enum("visibility", ["pseudonymous", "anonymous"]);
export const eventKind = fala.enum("event_kind", [
  "created",
  "sent_to_authority",
  "confirmed",
  "update_added",
  "photo_added",
  "official_response",
  "official_status_changed",
  "community_resolved",
  "reopened",
  "merged",
  "moderation",
]);

/**
 * The visible state of an item. History lives in item_events, append-only; these columns are the
 * current state those events produced, kept for fast reads (map, rail, Placar). Times are real
 * timestamps; "43 dias" and "há 38 min" are computed when read.
 */
export const items = fala
  .table(
    "items",
    {
      /** The public code ("7K3QF"). */
      id: text().primaryKey(),
      kind: itemKind().notNull(),
      category: text().notNull(),
      title: text().notNull(),
      text: text().notNull().default(""),
      neighborhood: text(),
      /** Point, place, bairro or city (core's ScopeSchema). */
      scope: jsonb().$type<Scope>().notNull(),
      /** The point on the map, when there is one: duplicates and distance queries. */
      lng: doublePrecision(),
      lat: doublePrecision(),
      visibility: visibility().notNull(),
      /** The public byline: the apelido at publication, null for "Anônimo em público". */
      authorNick: text(),
      community: communityStatus().notNull().default("reported"),
      officialStatus: officialStatus(),
      officialAgency: text(),
      officialAt: timestamp({ withTimezone: true }),
      confirmations: integer().notNull().default(0),
      followers: integer().notNull().default(0),
      updates: integer().notNull().default(0),
      /** Residents contradicting an official "resolved". */
      disagreeing: integer(),
      /** Dropped by a guest: held for moderation, two confirmations to count. */
      guest: boolean().notNull().default(false),
      /** Fictional demonstration data, always labelled "exemplo". */
      demo: boolean().notNull().default(false),
      createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
      updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
      /** enviadoEm: when the daily digest carried it. The public clock starts here. */
      sentAt: timestamp({ withTimezone: true }),
      /** protocoladoEm and its number, when the Prefeitura answered with one. */
      protocolNumber: text(),
      protocolAt: timestamp({ withTimezone: true }),
      /** When the community closed it. */
      closedAt: timestamp({ withTimezone: true }),
    },
    (t) => [index().on(t.category, t.community), index().on(t.neighborhood), index().on(t.updatedAt)],
  )
  .enableRLS();

/**
 * Who is behind each item. Kept apart from items so it can move into the identity vault: the account
 * behind an "Anônimo em público" item never leaves the server (round 18, Q5 and Q19).
 */
export const itemAuthors = fala
  .table("item_authors", {
    itemId: text()
      .primaryKey()
      .references(() => items.id, { onDelete: "cascade" }),
    accountId: uuid().notNull(),
  })
  .enableRLS();

/** Append-only history ("O Fala não decide quem está certo. Ele preserva o que aconteceu."). */
export const itemEvents = fala
  .table(
    "item_events",
    {
      id: uuid().primaryKey().defaultRandom(),
      /** Insertion order, for events that share a timestamp. */
      seq: integer().generatedAlwaysAsIdentity(),
      itemId: text()
        .notNull()
        .references(() => items.id, { onDelete: "cascade" }),
      at: timestamp({ withTimezone: true }).notNull().defaultNow(),
      kind: eventKind().notNull(),
      /** The public actor line: an apelido, "Anônimo", "Fala, Canoas" or a public body. */
      actor: text().notNull(),
      text: text().notNull(),
    },
    (t) => [index().on(t.itemId, t.at, t.seq)],
  )
  .enableRLS();

/** Photos over time. New ones live in the private "fotos" bucket; demo ones are static files. */
export const itemPhotos = fala
  .table(
    "item_photos",
    {
      id: uuid().primaryKey().defaultRandom(),
      itemId: text()
        .notNull()
        .references(() => items.id, { onDelete: "cascade" }),
      /** Public path: /api/fotos/<key> for stored photos, /media/... for demo ones. */
      src: text().notNull(),
      /** Object key in Supabase Storage, when stored there. */
      storageKey: text(),
      takenAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
      /** Apelido or "Anônimo". */
      by: text().notNull(),
      credit: text(),
      position: integer().notNull().default(0),
    },
    (t) => [index().on(t.itemId, t.position)],
  )
  .enableRLS();

/** Independent confirmations: one per account per item (round 18, Q17). */
export const itemConfirmations = fala
  .table(
    "item_confirmations",
    {
      itemId: text()
        .notNull()
        .references(() => items.id, { onDelete: "cascade" }),
      accountId: uuid().notNull(),
      createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [primaryKey({ columns: [t.itemId, t.accountId] })],
  )
  .enableRLS();
