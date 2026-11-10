import { WEB_DEV_VARS } from "@fala/dev-vars";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

/**
 * `bun run push:keys` (development): the VAPID key pair web push signs with (RFC 8292), written into
 * the gitignored .dev.vars. An existing pair is kept; nothing secret is printed. Production makes one
 * the same way and stores it as Worker secrets (wrangler secret put VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY).
 */
const VARS = WEB_DEV_VARS;
let vars = existsSync(VARS) ? readFileSync(VARS, "utf8") : "";
const has = (name: string) => new RegExp(`^${name}=`, "m").test(vars);

if (has("VAPID_PRIVATE_KEY") && has("VAPID_PUBLIC_KEY")) {
  console.log("Nada a fazer: as chaves de push já existem.");
} else {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const priv = await crypto.subtle.exportKey("jwk", pair.privateKey);
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  const publicKey = btoa(String.fromCharCode(...raw))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
  vars = vars.replace(/^VAPID_(PRIVATE|PUBLIC)_KEY=.*\n?/gm, "");
  if (vars && !vars.endsWith("\n")) vars += "\n";
  vars += `VAPID_PRIVATE_KEY=${JSON.stringify({ kty: priv.kty, crv: priv.crv, x: priv.x, y: priv.y, d: priv.d })}\n`;
  vars += `VAPID_PUBLIC_KEY=${publicKey}\n`;
  writeFileSync(VARS, vars, { mode: 0o600 });
  console.log("Escrito em apps/web/.dev.vars: VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY");
}
