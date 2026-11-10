import { DAY_MS } from "./format";
import { CONFIRMATION_MIN_HOURS } from "./identity";
import { countsFrom } from "./report";

/**
 * Sanctions and posting limits (DECISIONS round 19). A removal weighs against whoever sent the thing
 * by what it was: an honest mistake (a readable face, a photo that misses the problem) weighs nothing;
 * exposing a person, an offence or spam is a strike; nudity is grave. Strikes mute an account for a
 * while; a second moderator, or the controller, suspends one. Nothing here is ever shown in public.
 */

export type RemovalWeight = "none" | "strike" | "grave";

/** The reasons moderators reach for most, worded for the public history, each with what it weighs. */
export const REMOVAL_REASONS: { text: string; weight: RemovalWeight }[] = [
  { text: "Rosto ou placa legível.", weight: "none" },
  { text: "Mostra uma criança.", weight: "none" },
  { text: "Não mostra o problema.", weight: "none" },
  { text: "Expõe uma pessoa.", weight: "strike" },
  { text: "Ofensa ou ameaça.", weight: "strike" },
  { text: "Propaganda ou spam.", weight: "strike" },
  { text: "Nudez ou conteúdo sexual.", weight: "grave" },
];

/** What a reason weighs when a moderator picked it as is; anything typed by hand counts as a strike. */
export const weightOf = (note: string): RemovalWeight =>
  REMOVAL_REASONS.find((r) => r.text === note.trim())?.weight ?? "strike";

export const STRIKE_WINDOW_DAYS = 30;
export const STRIKES_TO_MUTE = 3;
export const MUTE_DAYS = 30;
export const SUSPEND_DAYS = 90;

/** Whether these removals (of one person's posts) mute them: one grave, or three strikes in 30 days. */
export function dueForMute(removals: { weight: RemovalWeight; at: Date }[], now: Date): boolean {
  const recent = removals.filter((r) => now.getTime() - r.at.getTime() < STRIKE_WINDOW_DAYS * DAY_MS);
  return (
    recent.some((r) => r.weight === "grave") || recent.filter((r) => r.weight !== "none").length >= STRIKES_TO_MUTE
  );
}

export type SanctionKind = "mute" | "suspend";

export interface SanctionState {
  kind: SanctionKind;
  startsAt: Date;
  /** Null for a permanent one, which only the controller can give. */
  endsAt: Date | null;
  liftedAt: Date | null;
  /** A suspension a moderator proposed counts only once a second one (or the controller) confirms it. */
  confirmed: boolean;
}

/** Where an account stands now: free to post, muted (everything waits for a moderator) or suspended. */
export type Standing = { kind: "ok" } | { kind: SanctionKind; until: Date | null };

const active = (s: SanctionState, now: Date) =>
  s.confirmed && !s.liftedAt && s.startsAt <= now && (s.endsAt === null || s.endsAt > now);

/** The strongest sanction in force; between two of a kind, the one that lasts longer. */
export function standing(sanctions: SanctionState[], now: Date): Standing {
  const live = sanctions.filter((s) => active(s, now));
  const kind = live.some((s) => s.kind === "suspend") ? "suspend" : live.length ? "mute" : null;
  if (!kind) return { kind: "ok" };
  const ends = live.filter((s) => s.kind === kind).map((s) => s.endsAt);
  const until = ends.includes(null) ? null : new Date(Math.max(...ends.map((e) => e?.getTime() ?? 0)));
  return { kind, until };
}

/** Per day, for one account. New accounts (a phone verified less than 72 h ago) get far less room. */
export interface PostingLimits {
  pins: number;
  photos: number;
  updates: number;
  reports: number;
}

export const NEW_ACCOUNT_LIMITS: PostingLimits = { pins: 3, photos: 5, updates: 10, reports: 10 };
export const ACCOUNT_LIMITS: PostingLimits = { pins: 20, photos: 40, updates: 60, reports: 30 };

export function postingLimits(phoneVerifiedAt: Date | null, now: Date): PostingLimits {
  const settled = phoneVerifiedAt && now >= countsFrom(phoneVerifiedAt);
  return settled ? ACCOUNT_LIMITS : NEW_ACCOUNT_LIMITS;
}

/** The sentence a muted or suspended person reads when they try to post. */
export function standingMessage(s: Exclude<Standing, { kind: "ok" }>, day: (d: Date) => string): string {
  const until = s.until ? ` até ${day(s.until)}` : "";
  return s.kind === "suspend"
    ? `Sua conta está suspensa${until}. Você pode ler tudo; o motivo e como contestar estão em Você.`
    : `Sua conta está silenciada${until}: registros e fotos passam pela moderação, e atualizações e conversas ficam fechadas. O motivo e como contestar estão em Você.`;
}

const LIMIT_NOUN: Record<keyof PostingLimits, [string, string]> = {
  pins: ["registro", "registros"],
  photos: ["foto", "fotos"],
  updates: ["atualização", "atualizações"],
  reports: ["denúncia", "denúncias"],
};

/** The sentence for someone who reached a daily limit, new accounts told why theirs is lower. */
export function limitMessage(kind: keyof PostingLimits, limits: PostingLimits): string {
  const n = limits[kind];
  const noun = LIMIT_NOUN[kind][n === 1 ? 0 : 1];
  return limits === NEW_ACCOUNT_LIMITS
    ? `Nos primeiros ${CONFIRMATION_MIN_HOURS / 24} dias, uma conta nova envia até ${n} ${noun} por dia. Tente de novo amanhã.`
    : `Você chegou a ${n} ${noun} hoje, o limite diário. Tente de novo amanhã.`;
}
