import { DAY_MS, localStamp } from "./format";
import { AFTER_CONFIRMATION, isOpen } from "./logic";
import type { Item, ItemEvent, ItemEventKind } from "./types";

/**
 * What neighbours can do with an item (DECISIONS rounds 4 and 15): structured actions instead of
 * likes, each one an event appended to the item's history. Closing belongs to the community: the
 * Prefeitura may say "resolvido", but a pin closes when its reporter or two neighbours confirm the
 * fix, or after 15 days without dispute; "Ainda não" reopens it.
 *
 * Pure: the server decides who the person is (author, independent, already acted) and persists what
 * comes out.
 */

export type ItemAction =
  /** "Confirmo" / "Isso também me afeta": one independent confirmation per account. */
  | { type: "confirm" }
  /** "Continua acontecendo" / "Ainda não": once a day per account; reopens a closing or closed pin. */
  | { type: "still" }
  /** "Foi resolvido", ideally with a photo of the after. */
  | { type: "resolved"; photos: string[] }
  /** "Adicionar atualização" / "Tenho informação". */
  | { type: "update"; text: string }
  /** "Adicionar foto atual": the photo timeline. */
  | { type: "photo"; photos: string[] };

export interface ActionContext {
  /** Apelido, or "Anônimo". */
  by: string;
  /** The account that registered the item. */
  author: boolean;
  /** A phone verified at least 72 h ago (round 18, Q17): the person's word can move the item's status. */
  independent: boolean;
  /** This account already did this (confirmed; said it continues today; voted resolved in this round). */
  already: boolean;
  now: Date;
  timezone: string;
}

export type ActionRefusal = "closed" | "own" | "too-new" | "already" | "kind" | "empty";

export type ActionOutcome =
  | {
      ok: true;
      item: Item;
      event: ItemEvent;
      /** The pin went back to open: a new round of resolution votes starts. */
      reopened: boolean;
      photos: string[];
    }
  | { ok: false; reason: ActionRefusal };

/** Neighbours (other than the reporter) whose "foi resolvido" closes a pin. */
export const RESOLVED_VOTES_TO_CLOSE = 2;
/** Days a pin marked resolved stays closing before it closes on its own, if nobody disputes it. */
export const QUIET_CLOSE_DAYS = 15;
export const UPDATE_MAX = 280;

export const resolvedCloses = (author: boolean, votes: number) => author || votes >= RESOLVED_VOTES_TO_CLOSE;
export const quietCloseDue = (resolvingSince: string | Date) =>
  new Date(new Date(resolvingSince).getTime() + QUIET_CLOSE_DAYS * DAY_MS);

const refuse = (reason: ActionRefusal): ActionOutcome => ({ ok: false, reason });

export function applyAction(it: Item, action: ItemAction, ctx: ActionContext): ActionOutcome {
  const event = (kind: ItemEventKind, text: string): ItemEvent => ({
    at: localStamp(ctx.now, ctx.timezone),
    actor: ctx.by,
    kind,
    text,
  });
  const withPhotos = (srcs: string[]) => [
    ...it.photos,
    ...srcs.map((src) => ({ src, takenAt: localStamp(ctx.now, ctx.timezone), by: ctx.by })),
  ];
  const touched: Item = { ...it, updatedMinutesAgo: 0, updates: it.updates + 1 };
  const done = (item: Item, e: ItemEvent, extra: { reopened?: boolean; photos?: string[] } = {}): ActionOutcome => ({
    ok: true,
    item: { ...item, events: [...(it.events ?? []), e] },
    event: e,
    reopened: extra.reopened ?? false,
    photos: extra.photos ?? [],
  });
  const occurrence = it.kind === "occurrence";

  switch (action.type) {
    case "update": {
      const text = action.text.trim().slice(0, UPDATE_MAX);
      if (!text) return refuse("empty");
      return done(touched, event("update_added", text));
    }

    case "photo": {
      const n = action.photos.length;
      if (!n) return refuse("empty");
      return done(
        { ...touched, photos: withPhotos(action.photos) },
        event("photo_added", n === 1 ? "Adicionou uma foto atual." : `Adicionou ${n} fotos atuais.`),
        { photos: action.photos },
      );
    }

    case "confirm": {
      if (!isOpen(it)) return refuse("closed");
      if (ctx.author) return refuse("own");
      if (ctx.already) return refuse("already");
      if (!ctx.independent) return refuse("too-new");
      return done(
        {
          ...touched,
          confirmations: it.confirmations + 1,
          community: occurrence ? AFTER_CONFIRMATION[it.community] : it.community,
        },
        event("confirmed", occurrence ? "Confirmou que está acontecendo." : "“Isso também me afeta.”"),
      );
    }

    case "still": {
      if (!occurrence) return refuse("kind");
      if (ctx.already) return refuse("already");
      if (!ctx.author && !ctx.independent) return refuse("too-new");
      const reopening = it.community === "apparently_resolved" || it.community === "resolved";
      const disputesOfficial = it.official?.status === "resolved";
      return done(
        {
          ...touched,
          community: "ongoing",
          resolvedVotes: 0,
          resolvingSince: null,
          closedAt: null,
          ...(disputesOfficial ? { disagreeing: (it.disagreeing ?? 0) + 1 } : {}),
        },
        reopening
          ? event("reopened", "Disse que ainda não foi resolvido. O registro reabriu.")
          : event("confirmed", "Disse que continua acontecendo."),
        { reopened: reopening },
      );
    }

    case "resolved": {
      if (!occurrence) return refuse("kind");
      if (!isOpen(it)) return refuse("closed");
      if (ctx.already) return refuse("already");
      if (!ctx.author && !ctx.independent) return refuse("too-new");
      const votes = (it.resolvedVotes ?? 0) + (ctx.author ? 0 : 1);
      const closes = resolvedCloses(ctx.author, votes);
      const photo = action.photos.length > 0;
      const since = it.resolvingSince ?? ctx.now.toISOString();
      const said = photo ? "Confirmou o conserto, com foto do depois." : "Confirmou o conserto.";
      return done(
        {
          ...touched,
          photos: withPhotos(action.photos),
          community: closes ? "resolved" : "apparently_resolved",
          resolvedVotes: votes,
          resolvingSince: since,
          closedAt: closes ? ctx.now.toISOString() : null,
        },
        event(
          "community_resolved",
          closes
            ? `${said} O registro fechou.`
            : `${said} Fecha com mais um vizinho, ou em ${QUIET_CLOSE_DAYS} dias sem contestação.`,
        ),
        { photos: action.photos },
      );
    }
  }
}

/**
 * A pin someone said was fixed, which nobody disputed for 15 days, closes on its own. Null when it
 * isn't due. The closing date is the end of the quiet period, not the day the job ran.
 */
export function quietClose(
  it: Item,
  now: Date,
  timezone: string,
  by: string,
): Extract<ActionOutcome, { ok: true }> | null {
  if (it.community !== "apparently_resolved" || !it.resolvingSince) return null;
  const due = quietCloseDue(it.resolvingSince);
  if (due > now) return null;
  const e: ItemEvent = {
    at: localStamp(due, timezone),
    actor: by,
    kind: "community_resolved",
    text: `Fechado: ${QUIET_CLOSE_DAYS} dias sem contestação.`,
  };
  return {
    ok: true,
    item: { ...it, community: "resolved", closedAt: due.toISOString(), events: [...(it.events ?? []), e] },
    event: e,
    reopened: false,
    photos: [],
  };
}
