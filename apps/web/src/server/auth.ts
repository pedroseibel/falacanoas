import { isBrazilianMobileE164, suggestNicks } from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { anonymous } from "better-auth/plugins/anonymous";
import { phoneNumber } from "better-auth/plugins/phone-number";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { deliverCode } from "./otp-outbox";

/** Extra origins allowed to call the auth API (tailnet, previews), comma-separated, from the environment. */
const extraOrigins = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

/**
 * Accounts (research/DECISIONS.md, rounds 2, 15 and 17): sign in with a code sent to a Brazilian
 * mobile; guests get an anonymous session that upgrades when they verify a phone. The public face of
 * an account is its apelido and bairro, set after the first sign-in.
 *
 * Until the database is connected, accounts live in memory and disappear on restart. Better Auth's
 * phone plugin stores the number in plain text; encrypting it at rest (with a keyed hash for lookup)
 * is required before launch and lands with the database.
 */
export const auth = betterAuth({
  appName: canoas.branding.name,
  database: memoryAdapter({ user: [], session: [], account: [], verification: [] }),
  trustedOrigins: [`https://${canoas.branding.domain}`, ...extraOrigins],
  // UUIDs keep ids compatible with Postgres row-level security (auth.uid()) later.
  advanced: {
    database: { generateId: "uuid" },
    // Cloudflare's client IP: kept with sessions (Marco Civil, art. 15: access logs for 6 months).
    ipAddress: { ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"] },
  },
  user: {
    additionalFields: {
      nick: { type: "string", required: false, input: false },
      neighborhood: { type: "string", required: false, input: false },
      identityVerified: { type: "boolean", required: false, defaultValue: false, input: false },
    },
  },
  plugins: [
    anonymous({ emailDomainName: "convidado.falacanoas.invalid", generateName: () => "Convidado" }),
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
    }),
    tanstackStartCookies(),
  ],
});
