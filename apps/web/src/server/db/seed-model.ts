import { deriveEvents, localTime, zonedDate, type Item, type Municipality } from "@fala/core";
import type { EventInsert, ItemInsert, PhotoInsert } from "../items-model";
import { storageKeyOf } from "../items-model";

/**
 * The fictional fixtures as rows (`bun run db:seed`). Fixtures speak in readings ("43 dias",
 * "há 38 min", "30 ago · 17:42") taken at the fixtures' own `now`; rows store instants. This turns
 * one into the other on a single consistent timeline: created, sent at 18:00, confirmed, answered,
 * closed. Every row is marked demo, so the app labels it "exemplo".
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "hoje · 13:42", "ontem · 19:30", "30 ago · 17:42" or "30 ago", read at `now`. Null if it isn't one. */
export function parseStamp(stamp: string, now: Date, timezone: string): Date | null {
  const m = /^(hoje|ontem|(\d{1,2}) ([a-z]{3}))(?: · (\d{2}):(\d{2}))?$/.exec(stamp.trim());
  if (!m) return null;
  const today = localTime(now, timezone);
  const hour = m[4] ? Number(m[4]) : 12;
  const minute = m[5] ? Number(m[5]) : 0;
  if (m[1] === "hoje" || m[1] === "ontem") {
    const at = zonedDate({ ...today, hour, minute }, timezone);
    return m[1] === "ontem" ? new Date(at.getTime() - DAY) : at;
  }
  const month = MONTHS.indexOf(m[3] ?? "") + 1;
  if (!month) return null;
  const at = zonedDate({ year: today.year, month, day: Number(m[2]), hour, minute }, timezone);
  // A date later than now belongs to last year.
  return at > now ? zonedDate({ year: today.year - 1, month, day: Number(m[2]), hour, minute }, timezone) : at;
}

/** A stable spread from the id, so seeded times differ between items but not between runs. */
const spread = (id: string, range: number) => [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 9973, 7) % range;

export interface SeedRows {
  row: ItemInsert;
  events: EventInsert[];
  photos: PhotoInsert[];
}

export function seedRows(
  item: Item,
  now: Date,
  { timezone, branding }: Pick<Municipality, "timezone" | "branding">,
): SeedRows {
  const updatedAt = new Date(now.getTime() - item.updatedMinutesAgo * MINUTE);
  const closedAt = item.community === "resolved" ? updatedAt : null;
  const anchor = closedAt ?? now;

  // The clock started at the 18:00 digest `days` before now (or before the day it was closed).
  let sentAt: Date | null = item.sentAt ? new Date(item.sentAt) : null;
  if (!item.sentAt) {
    const day = localTime(new Date(anchor.getTime() - item.days * DAY), timezone);
    sentAt = zonedDate({ ...day, hour: 18, minute: 0 }, timezone);
    // Not sent yet: an open item from today waits for tonight's digest.
    if (sentAt > anchor) sentAt = closedAt ? new Date(closedAt.getTime() - 30 * MINUTE) : null;
  }
  const start = sentAt ?? updatedAt;
  const createdAt = new Date(
    Math.min(start.getTime() - (1 + spread(item.id, 8)) * HOUR - spread(item.id, 60) * MINUTE, updatedAt.getTime()),
  );
  const officialAt = item.official ? new Date(now.getTime() - item.official.daysAgo * DAY) : null;

  const stamped = (item.events ?? []).map((e) => ({ ...e, when: parseStamp(e.at, now, timezone) }));
  const derived = stamped.length
    ? stamped
    : deriveEvents(item, () => "")
        .filter((e) => e.kind !== "sent_to_authority" || sentAt)
        .map((e, i, all) => {
          const firstConfirmation = all.findIndex((x) => x.kind === "confirmed") === i;
          const when =
            e.kind === "created"
              ? createdAt
              : e.kind === "sent_to_authority"
                ? sentAt
                : e.kind === "confirmed"
                  ? firstConfirmation
                    ? new Date(Math.min(start.getTime() + 2 * DAY, updatedAt.getTime()))
                    : updatedAt
                  : e.kind === "community_resolved"
                    ? closedAt
                    : officialAt;
          // Derived histories sign the digest as "Fala"; the instance has a name.
          return { ...e, actor: e.kind === "sent_to_authority" ? branding.name : e.actor, when };
        });

  const point = item.scope.type === "point" || item.scope.type === "place" ? item.scope : null;
  return {
    row: {
      id: item.id,
      kind: item.kind,
      category: item.category,
      title: item.title,
      text: item.text,
      flooding: item.flooding ?? null,
      neighborhood: item.neighborhood,
      scope: item.scope,
      lng: point?.lng ?? null,
      lat: point?.lat ?? null,
      visibility: item.visibility,
      authorNick: item.author,
      community: item.community,
      officialStatus: item.official?.status ?? null,
      officialAgency: item.official?.agency ?? null,
      officialAt,
      confirmations: item.confirmations,
      followers: item.followers,
      updates: item.updates,
      disagreeing: item.disagreeing ?? null,
      guest: item.guest ?? false,
      demo: true,
      createdAt,
      updatedAt,
      sentAt,
      protocolNumber: item.protocol?.number ?? null,
      protocolAt: item.protocol ? new Date(item.protocol.at) : null,
      closedAt,
      // A demo pin already "parece resolvido" had one neighbour say so, when it was last touched.
      ...(item.community === "apparently_resolved" ? { resolvedVotes: 1, resolvingSince: updatedAt } : {}),
    },
    events: derived.map((e) => ({
      itemId: item.id,
      at: e.when ?? updatedAt,
      kind: e.kind,
      actor: e.actor,
      text: e.text,
    })),
    photos: item.photos.map((p, position) => ({
      itemId: item.id,
      src: p.src,
      storageKey: storageKeyOf(p.src),
      takenAt: parseStamp(p.takenAt, now, timezone) ?? createdAt,
      by: p.by,
      credit: p.credit ?? null,
      position,
      // The demo's own pictures: nothing for moderation to look at.
      review: "approved",
    })),
  };
}

/** "há 2 h", "há 40 min", "há 3 dias", "ontem", "agora", read at `now`; null if it isn't one. */
export function parseAgo(ago: string, now: Date): Date | null {
  const s = ago.trim();
  if (s === "agora") return now;
  if (s === "ontem") return new Date(now.getTime() - DAY);
  const m = /^há (\d+) (min|h|dias?)$/.exec(s);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2] === "min" ? MINUTE : m[2] === "h" ? HOUR : DAY;
  return new Date(now.getTime() - n * unit);
}
