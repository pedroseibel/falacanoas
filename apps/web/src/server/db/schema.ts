import { ReportReasonSchema, type FollowPlace, type Scope } from "@fala/core";
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  customType,
  doublePrecision,
  index,
  integer,
  jsonb,
  numeric,
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
      /** A problem's ponto de referência, as the resident wrote it ("em frente à escola"). */
      reference: text(),
      /**
       * Street and number near the point, looked up once after it was registered (Nominatim; never
       * again, never in a job). Null when there's no point, or the lookup found nothing.
       */
      address: text(),
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
      /**
       * The key the person's phone gave the report before sending it (the report form's outbox): a
       * retry after a lost response finds this item instead of making a second one.
       */
      clientKey: uuid().unique(),
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
      /** When the stored bytes were deleted: removed photos after 6 months, escalated ones once an authority has them. */
      purgedAt: timestamp({ withTimezone: true }),
    },
    (t) => [index().on(t.itemId, t.position), uniqueIndex().on(t.storageKey)],
  )
  .enableRLS();

/**
 * What the screening service (apps/triagem; round 20) saw in a stored photo, keyed by its storage key
 * because screening runs after the upload, beside the report, not inside it. It only sorts the
 * moderator's queue: a likely nude photo is shown blurred, and faces and plates are counted.
 */
export const photoScreens = fala
  .table("photo_screens", {
    storageKey: text().primaryKey(),
    /** The highest score among exposed genitals, breasts, buttocks or anus, 0 to 1. */
    nudity: doublePrecision().notNull(),
    faces: integer().notNull(),
    plates: integer().notNull(),
    screenedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    /**
     * Known abuse material (BUILD 5.8; research/legal/hash-matching.md): the photo's PDQ fingerprint,
     * computed in São Paulo, is the only thing sent to Arachnid Shield, never the photo. `known` is
     * Shield's verdict ("no-known-match", "csam", "harmful-abusive-material", "test"), null until a
     * check succeeds; until then the photo stays out of the moderators' sight.
     */
    pdq: text(),
    /** PDQ's own quality score, 0 to 100; below 50 the fingerprint says little and Shield isn't asked. */
    pdqQuality: integer(),
    known: text(),
    /** "exact" or "near". */
    knownMatch: text(),
    /** Shield's database version (its timestamp) at the check: evidence of the state of the art. */
    knownDbVersion: text(),
    knownCheckedAt: timestamp({ withTimezone: true }),
    /**
     * The designated person's call on a match that isn't plainly csam (harmful-abusive-material, test),
     * made from the match record, never the image: "escalated" (reported like any escalation) or
     * "released" (back to ordinary moderation).
     */
    knownReview: text(),
    knownReviewedAt: timestamp({ withTimezone: true }),
    knownReviewNote: text(),
  })
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
    /** The moderation guide's version they accepted (features/moderation/guide-version.ts), and when. */
    guideVersion: text(),
    guideAcceptedAt: timestamp({ withTimezone: true }),
    /** The last push about cases waiting too long, so it comes at most every few hours. */
    alertedAt: timestamp({ withTimezone: true }),
  })
  .enableRLS();

export const applicationStatus = fala.enum("application_status", ["pending", "approved", "declined"]);

/**
 * A member asking to moderate (from Você). The operator decides (`moderator applications`, `approve`,
 * `decline`): who moderates stays an operator's decision, as with `moderator:add`.
 */
export const moderatorApplications = fala
  .table(
    "moderator_applications",
    {
      id: uuid().primaryKey().defaultRandom(),
      accountId: uuid()
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
      /** The bairros they offer to moderate. */
      neighborhoods: text().array().notNull(),
      /** Why they want to help, in their words (optional, up to 280 characters). */
      note: text(),
      status: applicationStatus().notNull().default("pending"),
      createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
      decidedAt: timestamp({ withTimezone: true }),
      decidedBy: text(),
      decisionNote: text(),
    },
    (t) => [
      uniqueIndex()
        .on(t.accountId)
        .where(sql`${t.status} = 'pending'`),
    ],
  )
  .enableRLS();

/**
 * Why a case exists: a guest pin, the text pre-screen, a photo waiting for its first look, a report
 * ("Denunciar"), a moderator taking something down on their own, or a pin from a muted account.
 */
export const caseReason = fala.enum("case_reason", ["guest_pin", "prescreen", "photo", "report", "takedown", "muted"]);
export const caseStatus = fala.enum("case_status", ["open", "published", "rejected", "republish"]);
export const contestStatus = fala.enum("contest_status", ["open", "upheld", "overturned"]);
/** What a removal weighs against whoever sent it (core's RemovalWeight, round 19). */
export const removalWeight = fala.enum("removal_weight", ["none", "strike", "grave"]);

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
      /** A removal's weight against whoever sent the thing: honest mistakes weigh nothing. */
      weight: removalWeight().notNull().default("strike"),
      createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [index().on(t.status), index().on(t.itemId), index().on(t.photoId), index().on(t.eventId)],
  )
  .enableRLS();

export const escalationKind = fala.enum("escalation_kind", ["child_abuse"]);

/**
 * Content that is a crime to keep up and a duty to report (round 20; ECA arts. 241-A and 241-B, Lei
 * 15.211/2025 art. 27): removed at once, never served again, not even to moderators, preserved for the
 * authorities, reported by the controller, and deleted once an authority confirms it has it. The
 * account id is kept without a foreign key, so closing the account doesn't erase what must be preserved.
 */
export const escalations = fala
  .table(
    "escalations",
    {
      id: uuid().primaryKey().defaultRandom(),
      kind: escalationKind().notNull(),
      caseId: uuid()
        .notNull()
        .references(() => moderationCases.id, { onDelete: "restrict" }),
      itemId: text()
        .notNull()
        .references(() => items.id, { onDelete: "restrict" }),
      /** The photo, when the escalation is about one; null for a whole pin or an update. */
      photoId: uuid().references(() => itemPhotos.id, { onDelete: "restrict" }),
      accountId: uuid(),
      createdBy: uuid().references(() => users.id, { onDelete: "set null" }),
      createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
      /** Where the controller reported it (SaferNet, Polícia Federal / Nidus, MPF) and the protocol it got. */
      reportedAt: timestamp({ withTimezone: true }),
      reportChannel: text(),
      reportProtocol: text(),
      /** The authority confirmed it received the report (Decreto 12.880, art. 39 §2). Receipt isn't validation. */
      receiptAt: timestamp({ withTimezone: true }),
      /**
       * The authority validated the report: only from here may the bytes be deleted (Portaria MJSP
       * 1.312/2026, arts. 11 §1 and 23 §2). Account data and logs stay.
       */
      validatedAt: timestamp({ withTimezone: true }),
      purgedAt: timestamp({ withTimezone: true }),
      /** "moderation" (a moderator escalated it) or "hash_match" (a known-material match, no one saw it). */
      source: text().notNull().default("moderation"),
      /** For a hash match: Shield's class and match type, as the report states its source. */
      matchClass: text(),
      matchType: text(),
      note: text(),
    },
    (t) => [index().on(t.itemId), index().on(t.photoId)],
  )
  .enableRLS();

export const sanctionKind = fala.enum("sanction_kind", ["mute", "suspend"]);
export const sanctionSource = fala.enum("sanction_source", ["auto", "moderator", "controller"]);

/**
 * Mutes and suspensions (round 19). Never public, never shown to moderators as a person: they see the
 * sanction's own code. A moderator mutes; a suspension a moderator proposes counts only once another
 * confirms it; only the controller gives a permanent one. The person is told why and can contest.
 */
export const sanctions = fala
  .table(
    "sanctions",
    {
      id: uuid().primaryKey().defaultRandom(),
      accountId: uuid()
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
      kind: sanctionKind().notNull(),
      source: sanctionSource().notNull(),
      /** Shown to the person, never in public. */
      reason: text().notNull(),
      startsAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
      /** Null: permanent, and only the controller gives those. */
      endsAt: timestamp({ withTimezone: true }),
      createdBy: uuid().references(() => users.id, { onDelete: "set null" }),
      /** Null while a proposed suspension waits for a second moderator. */
      confirmedAt: timestamp({ withTimezone: true }),
      confirmedBy: uuid().references(() => users.id, { onDelete: "set null" }),
      liftedAt: timestamp({ withTimezone: true }),
      liftedBy: uuid().references(() => users.id, { onDelete: "set null" }),
      liftNote: text(),
      contestText: text(),
      contestedAt: timestamp({ withTimezone: true }),
      contestStatus: contestStatus(),
      contestNote: text(),
      /** A suspension that came with an escalation: only the controller reviews it, never volunteers. */
      escalationId: uuid(),
      createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [index().on(t.accountId)],
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
    /** Its number in the year ("Resumo diário nº 0287/2026" is 287). Null before resumos were numbered. */
    number: integer(),
    /** SHA-256 of the PDF attached, as sent: what a printed or forwarded copy can be checked against. */
    pdfSha256: text(),
  })
  .enableRLS();

/** Raw bytes (a PDF). */
const bytea = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => "bytea",
  fromDriver: (v) => new Uint8Array(v),
});

/**
 * The monthly report per body (core monthly-report.ts), built once by apps/digest on the 1st, for the
 * month just ended, and kept as it was built: the figures and the PDF, public at /relatorios.
 */
export const monthlyReports = fala
  .table("monthly_reports", {
    /** "2026-10". */
    month: text().primaryKey(),
    generatedAt: timestamp({ withTimezone: true }).notNull(),
    /** Core's MonthlyReport. */
    figures: jsonb().notNull(),
    pdf: bytea().notNull(),
    pdfSha256: text().notNull(),
  })
  .enableRLS();

export const replyStatus = fala.enum("reply_status", ["applied", "review", "dismissed"]);

/**
 * An answer to a resumo, by e-mail (BUILD 3.1; core protocol-reply.ts): what was read from it and
 * what became of it. Protocols read with confidence are applied to the reports at once; the rest
 * waits for a person (`bun --filter @fala/digest respostas`). Only the reply's own text is kept,
 * without the resumo it quotes. The Prefeitura's correspondence, not residents' data.
 */
export const digestReplies = fala
  .table(
    "digest_replies",
    {
      id: uuid().primaryKey().defaultRandom(),
      receivedAt: timestamp({ withTimezone: true }).notNull(),
      /** The e-mail's Message-ID (or a hash of it when it has none): the same reply is read once. */
      messageId: text().notNull().unique(),
      digestId: uuid().references(() => digests.id, { onDelete: "set null" }),
      fromAddress: text().notNull(),
      subject: text().notNull().default(""),
      body: text().notNull(),
      /** Core's ReplyReading, with `applied` on each protocol. */
      reading: jsonb().notNull(),
      /** From a Prefeitura address, and authenticated (DMARC by our receiving server) or handed in by the operator. */
      trusted: boolean().notNull(),
      status: replyStatus().notNull(),
      decidedAt: timestamp({ withTimezone: true }),
      decidedBy: text(),
    },
    (t) => [index().on(t.status)],
  )
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

/** mm of rain, to the tenth the gauges measure (0.2 mm tips). */
const mm = () => numeric({ precision: 6, scale: 1, mode: "number" });

/**
 * The municipality's automatic rain gauges, archived from Cemaden's live feed every 10 minutes by
 * apps/digest (research/alagamentos; core rain.ts): one row per gauge per time it measured, so a
 * gauge that stops transmitting adds nothing. Cemaden keeps no public history; this is the city's.
 * Public measurements, not residents' data.
 */
export const rainReadings = fala
  .table(
    "rain_readings",
    {
      /** Cemaden's station id (instance config `rain.gauges`). */
      gauge: integer().notNull(),
      /** When the gauge measured it. */
      observedAt: timestamp({ withTimezone: true }).notNull(),
      /** The last 10-minute value. */
      last: mm(),
      acc1h: mm().notNull(),
      acc3h: mm().notNull(),
      acc6h: mm().notNull(),
      acc12h: mm().notNull(),
      acc24h: mm().notNull(),
      acc48h: mm().notNull(),
      acc72h: mm().notNull(),
      acc96h: mm().notNull(),
      /** When the archive read it from the feed. */
      fetchedAt: timestamp({ withTimezone: true }).notNull(),
    },
    (t) => [primaryKey({ columns: [t.gauge, t.observedAt] })],
  )
  .enableRLS();
