import { passkey } from "@better-auth/passkey";
import { suggestNicks } from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { betterAuth, type BetterAuthPlugin } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { anonymous } from "better-auth/plugins/anonymous";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { z } from "zod";
import { db } from "./db/client";
import { accounts, passkeys, rateLimits, sessions, users, verifications } from "./db/schema";
import { noteSignIn, readAssertion } from "./vault";

const list = (v: string | undefined) =>
  (v ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

/** Extra origins allowed to call the auth API (tailnet, previews), comma-separated, from the environment. */
const extraOrigins = list(process.env.BETTER_AUTH_TRUSTED_ORIGINS);

/** Passkeys are bound to a domain: the production one, or the tailnet host in development (an IP can't be one). */
const passkeyRpID = process.env.PASSKEY_RP_ID ?? canoas.branding.domain;
const passkeyOrigins = list(process.env.PASSKEY_ORIGINS);

/**
 * Phone sign-in through the identity vault (DECISIONS round 18, Q29). The vault sends and checks the
 * code and answers with a signed assertion naming the account; this endpoint turns a valid, unused
 * assertion into a session. The number itself never reaches the app, so Better Auth's phone plugin
 * isn't used at all.
 */
const vaultSignIn = {
  id: "vault-sign-in",
  endpoints: {
    signInVault: createAuthEndpoint(
      "/sign-in/vault",
      { method: "POST", body: z.object({ assertion: z.string().max(2048) }) },
      async (ctx) => {
        const a = await readAssertion(ctx.body.assertion);
        if (!a) throw new APIError("UNAUTHORIZED", { message: "Código expirado. Peça outro." });
        // Single use: an assertion copied from a request can't open a second session.
        const used = `cofre:${a.jti}`;
        if (await ctx.context.internalAdapter.findVerificationValue(used))
          throw new APIError("UNAUTHORIZED", { message: "Código expirado. Peça outro." });
        await ctx.context.internalAdapter.createVerificationValue({
          identifier: used,
          value: a.sub,
          expiresAt: new Date((a.exp + 60) * 1000),
        });

        const phone = { phoneVerifiedAt: new Date(a.phoneVerifiedAt), phoneHint: a.hint };
        const existing = await ctx.context.internalAdapter.findUserById(a.sub);
        const user = existing
          ? await ctx.context.internalAdapter.updateUser(a.sub, phone)
          : await ctx.context.internalAdapter.createUser(
              {
                id: a.sub,
                // Better Auth needs an e-mail and a name; neither may carry the phone number.
                email: `${a.sub}@telefone.falacanoas.invalid`,
                name: suggestNicks(Math.random, 1)[0] ?? "vizinho",
                emailVerified: false,
                ...phone,
              },
              { method: "vault" },
            );
        if (!user) throw new APIError("INTERNAL_SERVER_ERROR", { message: "Não deu para entrar agora." });
        const session = await ctx.context.internalAdapter.createSession(user.id);
        if (!session) throw new APIError("INTERNAL_SERVER_ERROR", { message: "Não deu para entrar agora." });
        await setSessionCookie(ctx, { session, user });
        return ctx.json({ ok: true, created: a.created });
      },
    ),
  },
} satisfies BetterAuthPlugin;

/**
 * Accounts (research/DECISIONS.md, rounds 2, 15, 17 and 18), in Postgres (the fala schema): sign in
 * with a code to a Brazilian mobile, through the vault; guests get an anonymous session; a passkey
 * can be added afterwards. The public face of an account is its apelido and bairro, set on /bem-vindo.
 */
export const auth = betterAuth({
  appName: canoas.branding.name,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
      passkey: passkeys,
      rateLimit: rateLimits,
    },
  }),
  trustedOrigins: [`https://${canoas.branding.domain}`, ...extraOrigins],
  advanced: {
    // The vault mints account ids as UUIDs; Better Auth's own ids match.
    database: { generateId: "uuid" },
    // Cloudflare's client IP, kept with sessions.
    ipAddress: { ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"] },
  },
  // Per IP, shared by every isolate. Codes are limited in the vault, per number and per IP.
  rateLimit: {
    enabled: true,
    storage: "database",
    customRules: {
      "/sign-in/vault": { window: 15 * 60, max: 30 },
      // Guest sessions (round 2) are cheap to open; each guest pin also needs a robot check.
      "/sign-in/anonymous": { window: 15 * 60, max: 5 },
    },
  },
  user: {
    additionalFields: {
      nick: { type: "string", required: false, input: false },
      neighborhood: { type: "string", required: false, input: false },
      identityVerified: { type: "boolean", required: false, defaultValue: false, input: false },
      /** First verification of the linked phone: confirmations count 72 h after it (round 18, Q17). */
      phoneVerifiedAt: { type: "date", required: false, input: false },
      /** "(51) 9…4567", from the vault. */
      phoneHint: { type: "string", required: false, input: false },
      /** "Declaro que tenho 18 anos ou mais", and when (round 18, Q30). */
      ageConfirmedAt: { type: "date", required: false, input: false },
      /** Which privacy notice the person confirmed reading, and when. */
      privacyNoticeVersion: { type: "string", required: false, input: false },
      privacyNoticeReadAt: { type: "date", required: false, input: false },
    },
  },
  databaseHooks: {
    // Every sign-in, passkeys included, keeps the account out of the 180-day dormancy rule (Q20).
    session: {
      create: {
        // No IP or browser on the session: the connection is recorded once, in the vault, kept
        // 6 months (round 18, Q21), and nowhere in the app's tables.
        before: async (session) => ({ data: { ...session, ipAddress: null, userAgent: null } }),
        after: async (session, ctx) => noteSignIn(session.userId, ctx?.headers ?? ctx?.request?.headers ?? null),
      },
    },
  },
  plugins: [
    anonymous({ emailDomainName: "convidado.falacanoas.invalid", generateName: () => "Convidado" }),
    vaultSignIn,
    passkey({
      rpID: passkeyRpID,
      rpName: canoas.branding.name,
      origin: passkeyOrigins.length ? passkeyOrigins : `https://${canoas.branding.domain}`,
    }),
    tanstackStartCookies(),
  ],
});
