import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** The service's settings. In development the database falls back to the web app's .dev.vars. */

const WEB_DEV_VARS = fileURLToPath(new URL("../../web/.dev.vars", import.meta.url));

function webDevVar(name: string): string {
  if (!existsSync(WEB_DEV_VARS)) return "";
  return (
    readFileSync(WEB_DEV_VARS, "utf8")
      .match(new RegExp(`^${name}=(.+)$`, "m"))?.[1]
      ?.trim() ?? ""
  );
}

export interface Config {
  mode: "development" | "production";
  databaseUrl: string;
  port: number;
  outboxDir: string;
}

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const mode = env.WHATSAPP_MODE === "production" || env.NODE_ENV === "production" ? "production" : "development";
  const databaseUrl =
    env.WHATSAPP_DATABASE_URL || env.DATABASE_URL || (mode === "development" ? webDevVar("DATABASE_URL") : "");
  if (!databaseUrl) throw new Error("Falta WHATSAPP_DATABASE_URL.");
  return {
    mode,
    databaseUrl,
    port: Number(env.PORT) || 3300,
    outboxDir: env.WHATSAPP_OUTBOX || fileURLToPath(new URL("../outbox", import.meta.url)),
  };
}
