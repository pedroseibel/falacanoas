import { canoas } from "@fala/instance-canoas";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * The service's settings. In development the database and the tokens fall back to the web app's and
 * the vault's .dev.vars.
 */

const WEB_DEV_VARS = fileURLToPath(new URL("../../web/.dev.vars", import.meta.url));
const VAULT_DEV_VARS = fileURLToPath(new URL("../../vault/.dev.vars", import.meta.url));

function devVar(file: string, name: string): string {
  if (!existsSync(file)) return "";
  return (
    readFileSync(file, "utf8")
      .match(new RegExp(`^${name}=(.+)$`, "m"))?.[1]
      ?.trim() ?? ""
  );
}
const webDevVar = (name: string) => devVar(WEB_DEV_VARS, name);

export interface Config {
  mode: "development" | "production";
  databaseUrl: string;
  port: number;
  outboxDir: string;
  /** Registering by WhatsApp: the instance's site and the two tokens; null turns it off. */
  site: { url: string; vaultToken: string; appToken: string } | null;
}

/** Development's tokens, the same as the vault's and the app's when their .dev.vars set none. */
const DEV_VAULT_TOKEN = "desenvolvimento-whatsapp-cofre-0000000000";
const DEV_APP_TOKEN = "desenvolvimento-whatsapp-app-00000000000000";

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const mode = env.WHATSAPP_MODE === "production" || env.NODE_ENV === "production" ? "production" : "development";
  const databaseUrl =
    env.WHATSAPP_DATABASE_URL || env.DATABASE_URL || (mode === "development" ? webDevVar("DATABASE_URL") : "");
  if (!databaseUrl) throw new Error("Falta WHATSAPP_DATABASE_URL.");
  const dev = mode === "development";
  const vaultToken =
    env.WHATSAPP_VAULT_TOKEN || (dev ? devVar(VAULT_DEV_VARS, "WHATSAPP_VAULT_TOKEN") || DEV_VAULT_TOKEN : "");
  const appToken = env.WHATSAPP_APP_TOKEN || (dev ? webDevVar("WHATSAPP_APP_TOKEN") || DEV_APP_TOKEN : "");
  const url = env.WHATSAPP_SITE_URL || (dev ? "http://localhost:3100" : `https://${canoas.branding.domain}`);
  return {
    mode,
    databaseUrl,
    port: Number(env.PORT) || 3300,
    outboxDir: env.WHATSAPP_OUTBOX || fileURLToPath(new URL("../outbox", import.meta.url)),
    site:
      vaultToken.length >= 32 && appToken.length >= 32 ? { url: url.replace(/\/$/, ""), vaultToken, appToken } : null,
  };
}
