import { maskedPhone } from "@fala/core";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ProfileSchema } from "@/features/auth/profile-schema";
import { PRIVACY_NOTICE_VERSION } from "@/features/legal/privacy";
import { auth } from "./auth";
import { claimNick } from "./nicks";
import { peekDevCode } from "./otp-outbox";
import { getSession as session } from "./session";

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

/** The signed-in person as the app sees them. The phone is only ever returned masked. */
export const getAccount = createServerFn({ method: "GET" }).handler(async () => {
  const s = await session();
  if (!s) return null;
  const u = s.user;
  return {
    id: u.id,
    nick: u.nick ?? null,
    neighborhood: u.neighborhood ?? null,
    guest: Boolean(u.isAnonymous),
    phone: u.phoneNumber ? maskedPhone(u.phoneNumber) : null,
    phoneVerified: Boolean(u.phoneNumberVerified),
    phoneVerifiedAt: iso(u.phoneVerifiedAt),
    identityVerified: Boolean(u.identityVerified),
    /** Both declarations made, against the current version of the privacy notice. */
    declarationsCurrent: Boolean(u.ageConfirmedAt) && u.privacyNoticeVersion === PRIVACY_NOTICE_VERSION,
  };
});
export type Account = NonNullable<Awaited<ReturnType<typeof getAccount>>>;

type SaveResult = { ok: true } | { ok: false; error: string };

/**
 * Sets the public apelido and bairro and records the declarations (round 18, Q28 and Q30): the age
 * declaration once, the notice version each time it changes. An apelido is unique across look-alike
 * spellings, and one that signed anything is never given to anyone else.
 */
export const saveProfile = createServerFn({ method: "POST" })
  .inputValidator(ProfileSchema)
  .handler(async ({ data }): Promise<SaveResult> => {
    const s = await session();
    if (!s || s.user.isAnonymous) throw new Error("Entre com seu telefone para escolher um apelido.");
    if (!claimNick(data.nick, s.user.id))
      return { ok: false, error: "Esse apelido, ou um muito parecido, já tem dono. Tente outro." };
    const ctx = await auth.$context;
    const now = new Date();
    await ctx.internalAdapter.updateUser(s.user.id, {
      nick: data.nick,
      name: data.nick,
      neighborhood: data.neighborhood,
      ...(s.user.ageConfirmedAt ? {} : { ageConfirmedAt: now }),
      ...(s.user.privacyNoticeVersion === PRIVACY_NOTICE_VERSION
        ? {}
        : { privacyNoticeVersion: PRIVACY_NOTICE_VERSION, privacyNoticeReadAt: now }),
    });
    return { ok: true };
  });

/**
 * The Turnstile site key for the sign-in page. Public by design; Cloudflare's always-pass test key in
 * development. Null in production without a key: the page then says sign-in is unavailable.
 */
export const getAuthConfig = createServerFn({ method: "GET" }).handler(async () => ({
  turnstileSiteKey: process.env.TURNSTILE_SITE_KEY ?? (import.meta.env.DEV ? "1x00000000000000000000AA" : null),
}));

/** Development only: the code that would have gone to WhatsApp. Returns null in production. */
export const getDevCode = createServerFn({ method: "POST" })
  .inputValidator(z.string().regex(/^\+55\d{10,11}$/))
  .handler(async ({ data }) => peekDevCode(data));
