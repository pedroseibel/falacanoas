import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Municipality } from "@fala/core";

/**
 * The API's settings. It connects as fala_dados, which reads only the `dados` views; in development
 * the connection string comes from the web app's .dev.vars, where `bun run db:roles` wrote it.
 */

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
}

export function loadConfig(muni: Municipality, env: Record<string, string | undefined> = process.env): Config {
  const mode = env.DADOS_MODE === "production" || env.NODE_ENV === "production" ? "production" : "development";
  const databaseUrl = env.DADOS_DATABASE_URL || (mode === "development" ? webDevVar("DADOS_DATABASE_URL") : "");
  if (!databaseUrl) throw new Error("Falta DADOS_DATABASE_URL (o papel fala_dados; `bun run db:roles`).");
  if (new URL(databaseUrl).username.split(".")[0] !== "fala_dados")
    throw new Error("Os dados abertos conectam como fala_dados, que só lê as visões do esquema dados.");
  // Data without a licence can't be reused; production waits for the instance to pick one.
  if (mode === "production" && !muni.openDataLicence)
    throw new Error("A instância ainda não escolheu a licença dos dados abertos (openDataLicence).");
  return { mode, databaseUrl, port: Number(env.PORT) || 3400 };
}
