import { ReportReasonSchema, type FollowPlace, type Scope } from "@fala/core";
import { sql } from "drizzle-orm";
import {
  bigint,
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
  uniqueIndex,
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
export const moderationState = fala.enum("moderation_state", ["published", "pending", "rejected"]);
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
      /** Guest pins start pending: only their tracking link opens them until moderation publishes them. */
      moderation: moderationState().notNull().default("published"),
      /** SHA-256 of a guest pin's secret tracking key (round 2): the link is the guest's only way back. */
      trackingKeyHash: text(),
      /**
       * What moderators see instead of an author (round 18, Q19): random per item, never a global id,
       * with no way back from it to the account.
       */
      moderationHandle: text().unique(),
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
      /** Neighbours who said it was fixed in the current round (round 4). */
      resolvedVotes: integer().notNull().default(0),
      /** When someone first said so in this round: 15 days later it closes, if undisputed. */
      resolvingSince: timestamp({ withTimezone: true }),
      /** The resolution round: "ainda não" reopens the pin and starts the next one. */
      round: integer().notNull().default(0),
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
    /** Closing the account deletes this row: the item stays, unlinked from who posted it (Q26). */
    accountId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
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
      /** Who wrote an update: a takedown counts against them, never against the pin's author. Never leaves the server. */
      accountId: uuid().references(() => users.id, { onDelete: "set null" }),
      /** When moderation took this update down. Its words are kept for a contest or a court, never shown. */
      hiddenAt: timestamp({ withTimezone: true }),
    },
    (t) => [index().on(t.itemId, t.at, t.seq)],
  )
  .enableRLS();

/**
 * Moderation looks at every photo before it shows (round 6; the abuse review of 2026-10-13): nobody
 * else sees a pending photo, and a removed one is kept privately, for a contest or a court, never served.
 */
export const photoReview = fala.enum("photo_review", ["pending", "approved", "removed"]);

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
      /** Who sent it: a removal counts against them, never against the pin's author. Never leaves the server. */
      accountId: uuid().references(() => users.id, { onDelete: "set null" }),
      review: photoReview().notNull().default("pending"),
    },
    (t) => [index().on(t.itemId, t.position), uniqueIndex().on(t.storageKey)],
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
      accountId: uuid()
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
      createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [primaryKey({ columns: [t.itemId, t.accountId] })],
  )
  .enableRLS();

export const voteKind = fala.enum("vote_kind", ["still", "resolved"]);

/**
 * Per-account marks that make actions once-only: "foi resolvido" once per resolution round,
 * "continua acontecendo" once a day (`slot` holds the round number or the local date).
 */
export const itemVotes = fala
  .table(
    "item_votes",
    {
      itemId: text()
        .notNull()
        .references(() => items.id, { onDelete: "cascade" }),
      accountId: uuid()
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
      kind: voteKind().notNull(),
      slot: text().notNull(),
      at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [primaryKey({ columns: [t.itemId, t.accountId, t.kind, t.slot] })],
  )
  .enableRLS();

/** "Acompanhar" a single pin (round 15). Homes, routes and bairros come with BUILD 2.4. */
export const itemFollows = fala
  .table(
    "item_follows",
    {
      itemId: text()
        .notNull()
        .references(() => items.id, { onDelete: "cascade" }),
      accountId: uuid()
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
      createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [primaryKey({ columns: [t.itemId, t.accountId] }), index().on(t.accountId)],
  )
  .enableRLS();

/** Places followed (round 15): a home and its radius, a bairro, a route. Single pins live in item_follows. */
export const follows = fala
  .table(
    "follows",
    {
      id: uuid().primaryKey().defaultRandom(),
      accountId: uuid()
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
      /** core's FollowPlaceSchema, parsed on the way in and out. */
      place: jsonb().$type<FollowPlace>().notNull(),
      createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [index().on(t.accountId)],
  )
  .enableRLS();

/* ---------- Forum (round 5): a board per bairro, and a conversation under each pin ---------- */

export const threads = fala
  .table(
    "threads",
    {
      id: uuid().primaryKey().defaultRandom(),
      /** The bairro board it belongs to; null for a pin's conversation outside any bairro. */
      neighborhood: text(),
      /** A pin's conversation: one per pin. */
      itemId: text()
        .unique()
        .references(() => items.id, { onDelete: "cascade" }),
      title: text().notNull(),
      authorNick: text().notNull(),
      /** Closing the account unlinks it; the conversation stays. */
      accountId: uuid().references(() => users.id, { onDelete: "set null" }),
      hidden: boolean().notNull().default(false),
      demo: boolean().notNull().default(false),
      createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
      lastPostAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [index().on(t.neighborhood, t.lastPostAt)],
  )
  .enableRLS();

export const posts = fala
  .table(
    "posts",
    {
      id: uuid().primaryKey().defaultRandom(),
      threadId: uuid()
        .notNull()
        .references(() => threads.id, { onDelete: "cascade" }),
      text: text().notNull(),
      authorNick: text().notNull(),
      accountId: uuid().references(() => users.id, { onDelete: "set null" }),
      /** Hidden by moderation: kept, with the decision, never shown. */
      hidden: boolean().notNull().default(false),
      demo: boolean().notNull().default(false),
      createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [index().on(t.threadId, t.createdAt)],
  )
  .enableRLS();

export const reportStatus = fala.enum("report_status", ["open", "hidden", "kept"]);

/** "Denunciar" on a post: a moderator hides it or keeps it. */
export const postReports = fala
  .table(
    "post_reports",
    {
      id: uuid().primaryKey().defaultRandom(),
      postId: uuid()
        .notNull()
        .references(() => posts.id, { onDelete: "cascade" }),
      reporterId: uuid().references(() => users.id, { onDelete: "set null" }),
      status: reportStatus().notNull().default("open"),
      note: text(),
      decidedBy: uuid().references(() => users.id, { onDelete: "set null" }),
      decidedAt: timestamp({ withTimezone: true }),
      createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [index().on(t.status), uniqueIndex("post_reports_once").on(t.postId, t.reporterId)],
  )
  .enableRLS();

/* ---------- Moderation (round 5; round 18, Q19 and Q31) ---------- */

/** Bairro volunteer moderators. They never see identity: cases show an opaque handle. */
export const moderators = fala
  .table("moderators", {
    accountId: uuid()
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Bairros this person moderates; null for every bairro. */
    neighborhoods: text().array(),
    addedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    /** Who added them and why: governance belongs to the associação. */
    addedBy: text().notNull(),
  })
  .enableRLS();

/**
 * Why a case exists: a guest pin, the text pre-screen, a photo waiting for its first look, a report
 * ("Denunciar"), or a moderator taking something down on their own.
 */
export const caseReason = fala.enum("case_reason", ["guest_pin", "prescreen", "photo", "report", "takedown"]);
export const caseStatus = fala.enum("case_status", ["open", "published", "rejected", "republish"]);
export const contestStatus = fala.enum("contest_status", ["open", "upheld", "overturned"]);

/** One decision to make about one item, and its contestation. */
export const moderationCases = fala
  .table(
    "moderation_cases",
    {
      id: uuid().primaryKey().defaultRandom(),
      itemId: text()
        .notNull()
        .references(() => items.id, { onDelete: "cascade" }),
      reason: caseReason().notNull(),
      /** A case about one photo (its first look, or a report on it); null when it's about the pin. */
      photoId: uuid().references(() => itemPhotos.id, { onDelete: "cascade" }),
      /** A case about one update in the pin's history; null when it's about the pin. */
      eventId: uuid().references(() => itemEvents.id, { onDelete: "cascade" }),
      /** core's ModerationFlag values the pre-screen raised. */
      flags: text()
        .array()
        .notNull()
        .default(sql`'{}'::text[]`),
      status: caseStatus().notNull().default("open"),
      /** The decision's reason, shown to the author and in the item's history. */
      note: text(),
      decidedBy: uuid().references(() => users.id, { onDelete: "set null" }),
      decidedAt: timestamp({ withTimezone: true }),
      contestText: text(),
      contestedAt: timestamp({ withTimezone: true }),
      contestStatus: contestStatus(),
      contestNote: text(),
      createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [index().on(t.status), index().on(t.itemId), index().on(t.photoId), index().on(t.eventId)],
  )
  .enableRLS();

export const reportReason = fala.enum("report_reason", ReportReasonSchema.enum);

/**
 * "Denunciar" on a pin, a photo or an update: each report joins its target's open case, so a pile of
 * reports is one decision. Visitors pass a robot check; a neighbour at nível 1 reports once per case.
 */
export const contentReports = fala
  .table(
    "content_reports",
    {
      id: uuid().primaryKey().defaultRandom(),
      caseId: uuid()
        .notNull()
        .references(() => moderationCases.id, { onDelete: "cascade" }),
      reason: reportReason().notNull(),
      note: text(),
      /** Null for a visitor. Never shown to moderators or to whoever posted. */
      reporterId: uuid().references(() => users.id, { onDelete: "set null" }),
      createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [index().on(t.caseId), uniqueIndex("content_reports_once").on(t.caseId, t.reporterId)],
  )
  .enableRLS();

/* ---------- The daily digest (round 5; BUILD 3.1) ---------- */

/**
 * Each digest sent to the Ouvidoria: to whom, what, which items, and how it went out. Its time is
 * when those items' public clocks started, so the record stays as the proof.
 */
export const digests = fala
  .table("digests", {
    id: uuid().primaryKey().defaultRandom(),
    sentAt: timestamp({ withTimezone: true }).notNull(),
    recipients: text().array().notNull(),
    subject: text().notNull(),
    body: text().notNull(),
    itemIds: text().array().notNull(),
    /** "arquivo" in development (an .eml file, nothing sent), or the provider's name. */
    transport: text().notNull(),
    /** The provider's message id, to match replies (protocol numbers) later. */
    messageId: text(),
  })
  .enableRLS();

/* ---------- Web push (round 15: following; BUILD 4.2) ---------- */

/**
 * One browser's push subscription, for one account. The endpoint is the push service's URL for that
 * browser; the keys encrypt what's sent to it (RFC 8291). Dead ones (404/410) are deleted on the next
 * send; closing the account deletes them all.
 */
export const pushSubscriptions = fala
  .table(
    "push_subscriptions",
    {
      id: uuid().primaryKey().defaultRandom(),
      accountId: uuid()
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
      endpoint: text().notNull().unique(),
      p256dh: text().notNull(),
      auth: text().notNull(),
      createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [index().on(t.accountId)],
  )
  .enableRLS();

/* ---------- The data-subject channel (round 18; LGPD art. 18) ---------- */

export const requester = fala.enum("requester", ["account", "guest", "in_content", "former", "other"]);
export const requestKind = fala.enum("request_kind", [
  "access",
  "copy",
  "correction",
  "content",
  "deletion",
  "objection",
  "other",
]);
export const requestStatus = fala.enum("request_status", ["open", "answered"]);
/** How the requester showed the request is theirs: their session, or a guest pin's secret link. */
export const requestProof = fala.enum("request_proof", ["session", "tracking_key"]);

/**
 * A request from anyone, with or without an account, answered by the controller within 15 days
 * (LGPD art. 19). Kept to show it was answered; how long is set with the legal review.
 */
export const dataRequests = fala
  .table(
    "data_requests",
    {
      id: uuid().primaryKey().defaultRandom(),
      /** "PD-7K3QFA": what the person quotes when they write back. */
      protocol: text().notNull().unique(),
      requester: requester().notNull(),
      kind: requestKind().notNull(),
      /** The pin it's about, if any. Never the guest's key: only whether it matched. */
      itemId: text(),
      proof: requestProof(),
      text: text().notNull(),
      /** The e-mail for the answer. */
      contact: text().notNull(),
      accountId: uuid().references(() => users.id, { onDelete: "set null" }),
      status: requestStatus().notNull().default("open"),
      answeredAt: timestamp({ withTimezone: true }),
      note: text(),
      createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [index().on(t.status, t.createdAt)],
  )
  .enableRLS();

/* ---------- Accounts (Better Auth; rounds 17 and 18) ---------- */
/*
 * The phone is not here: it lives in the identity vault (apps/vault), which tells the app only which
 * account signed in. Better Auth reads these through its Drizzle adapter (src/server/auth.ts). With
 * UUID ids on Postgres it leaves the id to the database, hence the defaults; the vault's account ids
 * are passed in explicitly.
 */

const at = () => timestamp({ withTimezone: true });

export const users = fala
  .table("users", {
    id: uuid().primaryKey().defaultRandom(),
    /** Better Auth requires a name and an e-mail; the name is the apelido, the e-mail a placeholder. */
    name: text().notNull(),
    email: text().notNull().unique(),
    emailVerified: boolean().notNull().default(false),
    image: text(),
    createdAt: at().notNull().defaultNow(),
    updatedAt: at().notNull().defaultNow(),
    /** A guest session (round 2): reads and drops guest pins, nothing else. */
    isAnonymous: boolean().default(false),
    nick: text(),
    neighborhood: text(),
    /** Room for nível 2, optional civil identity (round 18, Q12): no flow sets it yet. */
    identityVerified: boolean().default(false),
    /** First verification of the phone now linked: confirmations count 72 h after it (Q17). */
    phoneVerifiedAt: at(),
    /** "(51) 9…4567", from the vault: enough to recognise the number, not to call it. */
    phoneHint: text(),
    ageConfirmedAt: at(),
    privacyNoticeVersion: text(),
    privacyNoticeReadAt: at(),
  })
  .enableRLS();

export const sessions = fala
  .table(
    "sessions",
    {
      id: uuid().primaryKey().defaultRandom(),
      userId: uuid()
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
      token: text().notNull().unique(),
      expiresAt: at().notNull(),
      ipAddress: text(),
      userAgent: text(),
      createdAt: at().notNull().defaultNow(),
      updatedAt: at().notNull().defaultNow(),
    },
    (t) => [index().on(t.userId)],
  )
  .enableRLS();

/** Better Auth's credential links. With phone sign-in through the vault, nothing writes here yet. */
export const accounts = fala
  .table(
    "accounts",
    {
      id: uuid().primaryKey().defaultRandom(),
      accountId: text().notNull(),
      providerId: text().notNull(),
      userId: uuid()
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
      accessToken: text(),
      refreshToken: text(),
      idToken: text(),
      accessTokenExpiresAt: at(),
      refreshTokenExpiresAt: at(),
      scope: text(),
      password: text(),
      createdAt: at().notNull().defaultNow(),
      updatedAt: at().notNull().defaultNow(),
    },
    (t) => [index().on(t.userId)],
  )
  .enableRLS();

/** Short-lived values: passkey challenges, and the ids of vault assertions already used. */
export const verifications = fala
  .table(
    "verifications",
    {
      id: uuid().primaryKey().defaultRandom(),
      identifier: text().notNull(),
      value: text().notNull(),
      expiresAt: at().notNull(),
      createdAt: at().notNull().defaultNow(),
      updatedAt: at().notNull().defaultNow(),
    },
    (t) => [index().on(t.identifier)],
  )
  .enableRLS();

export const passkeys = fala
  .table(
    "passkeys",
    {
      id: uuid().primaryKey().defaultRandom(),
      name: text(),
      publicKey: text().notNull(),
      userId: uuid()
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
      credentialID: text("credential_id").notNull(),
      counter: integer().notNull(),
      deviceType: text().notNull(),
      backedUp: boolean().notNull(),
      transports: text(),
      createdAt: at(),
      aaguid: text(),
    },
    (t) => [index().on(t.userId), index().on(t.credentialID)],
  )
  .enableRLS();

/** Better Auth's per-IP limits, shared by every Worker isolate. */
export const rateLimits = fala
  .table("rate_limits", {
    id: uuid().primaryKey().defaultRandom(),
    key: text().notNull().unique(),
    count: integer().notNull(),
    lastRequest: bigint({ mode: "number" }).notNull(),
  })
  .enableRLS();

/**
 * Apelido reservations (round 18, Q28), keyed by the normalized name so look-alike variants collide.
 * Holds account ids only, never civil identity. A name that signed anything public is never reused;
 * one that never did is released 90 days after its owner moves on.
 */
export const nickReservations = fala
  .table(
    "nick_reservations",
    {
      key: text().primaryKey(),
      ownerId: uuid(),
      lastOwnerId: uuid().notNull(),
      published: boolean().notNull().default(false),
      releasedAt: at(),
    },
    (t) => [index().on(t.ownerId)],
  )
  .enableRLS();
