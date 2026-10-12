import { getSession } from "./session";

export type Failure = { ok: false; error: string };

/**
 * The signed-in neighbour who may write (round 18, nível 1): a phone verified through the vault and
 * an apelido. Otherwise, the sentence that tells them what's missing.
 */
export async function member(
  doing = "registrar",
): Promise<{ id: string; nick: string; phoneVerifiedAt: Date | null } | Failure> {
  const user = (await getSession())?.user;
  if (!user || user.isAnonymous || !user.phoneVerifiedAt)
    return { ok: false, error: `Entre com o seu celular para ${doing}.` };
  if (!user.nick) return { ok: false, error: `Escolha um apelido antes de ${doing}.` };
  return { id: user.id, nick: user.nick, phoneVerifiedAt: user.phoneVerifiedAt ?? null };
}
