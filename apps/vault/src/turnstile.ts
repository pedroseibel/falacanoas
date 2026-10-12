import { SEND_CODE_ACTION } from "@fala/core";
import { z } from "zod";
import type { Human } from "./gateway";

/** Cloudflare's published test secret, which always passes; only ever used in development. */
const TEST_SECRET = "1x0000000000000000000000000000000AA";
const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const ReplySchema = z.object({
  success: z.boolean(),
  action: z.string().optional(),
  hostname: z.string().optional(),
});

/**
 * No code goes out without a Turnstile token checked with Siteverify (round 18, Q16). With real keys
 * the token must also be minted for the sign-in action on the instance's own host. Without a secret
 * outside development, every check fails: sending a code costs money.
 */
export function turnstile(
  env: { TURNSTILE_SECRET_KEY?: string; TURNSTILE_HOSTNAME?: string },
  development: boolean,
): Human {
  const secret = env.TURNSTILE_SECRET_KEY ?? (development ? TEST_SECRET : "");
  return async (token, ip) => {
    if (!secret) return false;
    const form = new FormData();
    form.set("secret", secret);
    form.set("response", token);
    if (ip) form.set("remoteip", ip);
    const res = await fetch(SITEVERIFY, { method: "POST", body: form });
    const reply = ReplySchema.safeParse(await res.json().catch(() => null));
    if (!reply.success || !reply.data.success) return false;
    if (secret === TEST_SECRET) return true;
    return reply.data.action === SEND_CODE_ACTION && reply.data.hostname === env.TURNSTILE_HOSTNAME;
  };
}
