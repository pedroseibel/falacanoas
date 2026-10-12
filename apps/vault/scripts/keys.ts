import { existsSync, readFileSync, writeFileSync } from "node:fs";

/**
 * `bun run keys` (development): gives the vault its keys and the app the vault's public key, written
 * straight into the gitignored .dev.vars files. Existing values are kept; nothing secret is printed.
 * Production keys are made the same way and stored as Worker secrets (wrangler secret put).
 */
const VAULT_VARS = ".dev.vars";
const WEB_VARS = "../web/.dev.vars";

const read = (path: string) => (existsSync(path) ? readFileSync(path, "utf8") : "");
const has = (text: string, name: string) => new RegExp(`^${name}=`, "m").test(text);
const random32 = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));

let vault = read(VAULT_VARS);
let web = read(WEB_VARS);
const added: string[] = [];
const add = (file: "vault" | "web", name: string, value: string) => {
  const line = `${name}=${value}\n`;
  if (file === "vault") vault += (vault && !vault.endsWith("\n") ? "\n" : "") + line;
  else web += (web && !web.endsWith("\n") ? "\n" : "") + line;
  added.push(`${file === "vault" ? "apps/vault" : "apps/web"}/.dev.vars: ${name}`);
};

if (!has(vault, "VAULT_MODE")) add("vault", "VAULT_MODE", "development");
if (!has(vault, "VAULT_KEY_VERSION")) add("vault", "VAULT_KEY_VERSION", "1");
if (!has(vault, "VAULT_SEAL_KEYS")) add("vault", "VAULT_SEAL_KEYS", JSON.stringify({ 1: random32() }));
if (!has(vault, "VAULT_MAC_KEYS")) add("vault", "VAULT_MAC_KEYS", JSON.stringify({ 1: random32() }));
if (!has(vault, "VAULT_SIGNING_KEY") || !has(web, "VAULT_VERIFY_KEY")) {
  const pair = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
  const priv = await crypto.subtle.exportKey("jwk", pair.privateKey);
  const pub = await crypto.subtle.exportKey("jwk", pair.publicKey);
  vault = vault.replace(/^VAULT_SIGNING_KEY=.*\n?/m, "");
  web = web.replace(/^VAULT_VERIFY_KEY=.*\n?/m, "");
  add("vault", "VAULT_SIGNING_KEY", JSON.stringify({ kty: priv.kty, crv: priv.crv, x: priv.x, d: priv.d }));
  add("web", "VAULT_VERIFY_KEY", JSON.stringify({ kty: pub.kty, crv: pub.crv, x: pub.x }));
}

writeFileSync(VAULT_VARS, vault, { mode: 0o600 });
writeFileSync(WEB_VARS, web, { mode: 0o600 });
console.log(added.length ? `Escrito:\n- ${added.join("\n- ")}` : "Nada a fazer: as chaves já existem.");
