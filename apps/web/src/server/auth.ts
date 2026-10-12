import { passkey } from "@better-auth/passkey";
import { isBrazilianMobileE164, suggestNicks } from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { anonymous } from "better-auth/plugins/anonymous";
import { captcha } from "better-auth/plugins";
import { phoneNumber } from "better-auth/plugins/phone-number";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { SEND_CODE_ACTION } from "@/features/auth/send-code";
import { admitCode } from "./limits";
import { deliverCode } from "./otp-outbox";

const list = (v: string | undefined) =>
  (v ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

/** Extra origins allowed to call the auth API (tailnet, previews), comma-separated, from the environment. */
const extraOrigins = list(process.env.BETTER_AUTH_TRUSTED_ORIGINS);

/**
 * Cloudflare's published test secret (always passes) in development. In production the real secret is
 * required: without it, sending a code fails rather than skipping the check.
 */
const TURNSTILE_TEST_SECRET = "1x0000000000000000000000000000000AA";
const turnstileSecret = process.env.TURNSTILE_SECRET_KEY ?? (import.meta.env.DEV ? TURNSTILE_TEST_SECRET : "");
const realTurnstile = turnstileSecret !== TURNSTILE_TEST_SECRET;

/** Passkeys are bound to a domain: the production one, or the tailnet host in development (an IP can't be one). */
const passkeyRpID = process.env.PASSKEY_RP_ID ?? canoas.branding.domain;
const passkeyOrigins = list(process.env.PASSKEY_ORIGINS);

/**
 * Accounts (research/DECISIONS.md, rounds 2, 15, 17 and 18): sign in with a code sent to a Brazilian
 * mobile; guests get an anonymous session that upgrades when they verify a phone; a passkey can be
 * added afterwards. The public face of an account is its apelido and bairro, set on /bem-vindo.
 *
 * Until the database is connected, accounts live in memory and disappear on restart. Better Auth's
 * phone plugin stores the number in plain text; the vault and auth gateway of round 18 (Q29) replace
 * that before launch.
 */
export const auth = betterAuth({
  appName: canoas.branding.name,
  database: memoryAdapter({ user: [], session: [], account: [], verification: [], passkey: [] }),
  trustedOrigins: [`https://${canoas.branding.domain}`, ...extraOrigins],
  // UUIDs keep ids compatible with Postgres row-level security (auth.uid()) later.
  advanced: {
    database: { generateId: "uuid" },
    // Cloudflare's client IP: kept with sessions (Marco Civil, art. 15: access logs for 6 months).
    ipAddress: { ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"] },
  },
  // Per IP, in development too (round 18, Q16). Codes are also limited per number in the hook below.
  rateLimit: {
    enabled: true,
    storage: "memory",
    customRules: {
      "/phone-number/send-otp": { window: 15 * 60, max: 10 },
      "/phone-number/verify": { window: 15 * 60, max: 20 },
    },
  },
  user: {
    additionalFields: {
      nick: { type: "string", required: false, input: false },
      neighborhood: { type: "string", required: false, input: false },
      identityVerified: { type: "boolean", required: false, defaultValue: false, input: false },
      /** First time this phone was verified: confirmations count 72 h after it (round 18, Q17). */
      phoneVerifiedAt: { type: "date", required: false, input: false },
      /** "Declaro que tenho 18 anos ou mais", and when (round 18, Q30). */
      ageConfirmedAt: { type: "date", required: false, input: false },
      /** Which privacy notice the person confirmed reading, and when. */
      privacyNoticeVersion: { type: "string", required: false, input: false },
      privacyNoticeReadAt: { type: "date", required: false, input: false },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/phone-number/send-otp") return;
      const phone: unknown = ctx.body?.phoneNumber;
      if (typeof phone === "string" && !admitCode(phone))
        throw new APIError("TOO_MANY_REQUESTS", { message: "Muitos códigos para este número. Espere um pouco." });
    }),
  },
  plugins: [
    anonymous({ emailDomainName: "convidado.falacanoas.invalid", generateName: () => "Convidado" }),
    // Sending a code costs money: no message goes out without a Turnstile token checked by Siteverify.
    captcha({
      provider: "cloudflare-turnstile",
      secretKey: turnstileSecret,
      endpoints: ["/phone-number/send-otp"],
      // The test secret answers with a placeholder action and hostname, so these only apply to real keys.
      ...(realTurnstile ? { expectedAction: SEND_CODE_ACTION, allowedHostnames: [canoas.branding.domain] } : {}),
    }),
    phoneNumber({
      otpLength: 6,
      expiresIn: 300,
      allowedAttempts: 3,
      phoneNumberValidator: isBrazilianMobileE164,
      sendOTP: ({ phoneNumber: phone, code }) => deliverCode(phone, code),
      // The account needs an e-mail and a name; neither may carry the phone number.
      signUpOnVerification: {
        getTempEmail: () => `${crypto.randomUUID()}@telefone.falacanoas.invalid`,
        getTempName: () => suggestNicks(Math.random, 1)[0] ?? "vizinho",
      },
      callbackOnVerification: async ({ user }) => {
        const ctx = await auth.$context;
        const current = await ctx.internalAdapter.findUserById(user.id);
        if (current && !("phoneVerifiedAt" in current && current.phoneVerifiedAt))
          await ctx.internalAdapter.updateUser(user.id, { phoneVerifiedAt: new Date() });
      },
    }),
    passkey({
      rpID: passkeyRpID,
      rpName: canoas.branding.name,
      origin: passkeyOrigins.length ? passkeyOrigins : `https://${canoas.branding.domain}`,
    }),
    tanstackStartCookies(),
  ],
});
