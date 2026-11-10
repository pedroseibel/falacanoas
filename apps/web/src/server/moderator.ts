import { MODERATION_GUIDE_VERSION } from "@/features/moderation/guide-version";
import type { Failure } from "./member";
import { moderatorOf, type Moderator } from "./moderation-store";
import { getSession } from "./session";

export async function sessionModerator(): Promise<{ id: string; mod: Moderator } | null> {
  const user = (await getSession())?.user;
  const mod = user ? await moderatorOf(user.id) : null;
  return user && mod ? { id: user.id, mod } : null;
}

/** Whether a moderator accepted the guide as it stands today: they accept again when it changes. */
export const guideCurrent = (mod: Pick<Moderator, "guideVersion">) => mod.guideVersion === MODERATION_GUIDE_VERSION;

export const GUIDE_FIRST: Failure = { ok: false, error: "Leia e aceite o guia da moderação antes de decidir." };
