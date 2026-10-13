import { standingMessage, type Standing } from "@fala/core";
import { dayOf, standingOf } from "./sanctions-store";
import { db } from "./db/client";
import { getSession } from "./session";

export type Failure = { ok: false; error: string };

export interface Member {
  id: string;
  nick: string;
  phoneVerifiedAt: Date | null;
  /** Free to post, or muted (round 19): a suspended account never gets this far. */
  standing: Exclude<Standing, { kind: "suspend" }>;
}

/**
 * The signed-in neighbour who may write (round 18, nível 1): a phone verified through the vault and
 * an apelido, not suspended (round 19). Otherwise, the sentence that tells them what's missing.
 */
export async function member(doing = "registrar"): Promise<Member | Failure> {
  const user = (await getSession())?.user;
  if (!user || user.isAnonymous || !user.phoneVerifiedAt)
    return { ok: false, error: `Entre com o seu celular para ${doing}.` };
  if (!user.nick) return { ok: false, error: `Escolha um apelido antes de ${doing}.` };
  const standing = await standingOf(db, user.id);
  if (standing.kind === "suspend") return { ok: false, error: standingMessage(standing, dayOf) };
  return { id: user.id, nick: user.nick, phoneVerifiedAt: user.phoneVerifiedAt ?? null, standing };
}

/** A muted account can still register (held for a moderator) and confirm, but not write updates or replies. */
export const mutedRefusal = (who: Member): Failure | null =>
  who.standing.kind === "mute" ? { ok: false, error: standingMessage(who.standing, dayOf) } : null;
