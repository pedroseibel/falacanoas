import { DEV_WHATSAPP_APP_TOKEN, DEV_WHATSAPP_VAULT_TOKEN, siteUrl } from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { fromDevVars, serviceMode, VAULT_DEV_VARS, WEB_DEV_VARS } from "@fala/dev-vars";
import { fileURLToPath } from "node:url";

/**
 * The service's settings. In development the database and the tokens fall back to the web app's and
 * the vault's .dev.vars.
 */

export interface Config {
  mode: "development" | "production";
  databaseUrl: string;
  port: number;
  outboxDir: string;
  /** Registering by WhatsApp: the instance's site and the two tokens; null turns it off. */
  site: { url: string; vaultToken: string; appToken: string } | null;
}

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const mode = serviceMode(env, "WHATSAPP_MODE");
  const databaseUrl =
    env.WHATSAPP_DATABASE_URL ||
    env.DATABASE_URL ||
    (mode === "development" ? fromDevVars(WEB_DEV_VARS, "DATABASE_URL") : "");
  if (!databaseUrl) throw new Error("Falta WHATSAPP_DATABASE_URL.");
  const dev = mode === "development";
  const vaultToken =
    env.WHATSAPP_VAULT_TOKEN ||
    (dev ? fromDevVars(VAULT_DEV_VARS, "WHATSAPP_VAULT_TOKEN") || DEV_WHATSAPP_VAULT_TOKEN : "");
  const appToken =
    env.WHATSAPP_APP_TOKEN || (dev ? fromDevVars(WEB_DEV_VARS, "WHATSAPP_APP_TOKEN") || DEV_WHATSAPP_APP_TOKEN : "");
  const url = env.WHATSAPP_SITE_URL || (dev ? "http://localhost:3100" : siteUrl(canoas));
  return {
    mode,
    databaseUrl,
    port: Number(env.PORT) || 3300,
    outboxDir: env.WHATSAPP_OUTBOX || fileURLToPath(new URL("../outbox", import.meta.url)),
    site:
      vaultToken.length >= 32 && appToken.length >= 32 ? { url: url.replace(/\/$/, ""), vaultToken, appToken } : null,
  };
}
